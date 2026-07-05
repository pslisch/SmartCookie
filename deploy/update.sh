#!/usr/bin/env bash

# deploy/update.sh - Safe, idempotent update tool for SmartCookie LMS.
# Designed to be run via:
#   sudo /opt/smartcookie/deploy/update.sh

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

echo "===================================================="
echo "          SmartCookie LMS Safe Update Tool          "
echo "===================================================="

# Ensure running with sudo access
if [ "$EUID" -ne 0 ]; then
    echo_error "This script must be run with sudo privileges."
    exit 1
fi

INSTALL_DIR="/opt/smartcookie"

# Pre-check: Target directory and systemd unit file must exist (TASK 2 Requirement)
if [ ! -d "$INSTALL_DIR" ] || ! systemctl list-unit-files | grep -q "^smartcookie\.service"; then
    echo_error "SmartCookie LMS is not currently installed or configured as a systemd service!"
    echo "Please use the bootstrap script to perform a fresh installation first:"
    echo "  sudo ./deploy/bootstrap.sh"
    exit 1
fi

cd "$INSTALL_DIR"

# Compare local HEAD to origin/main HEAD (idempotent no-op requirement)
echo_info "Fetching latest updates from git repository..."
git fetch origin main >/dev/null 2>&1 || true

LOCAL_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "local")
REMOTE_HEAD=$(git rev-parse origin/main 2>/dev/null || echo "remote")

if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
    echo_success "SmartCookie LMS is already up to date at commit $LOCAL_HEAD."
    exit 0
fi

echo_info "An update is available (Local: ${LOCAL_HEAD:0:7}, Remote: ${REMOTE_HEAD:0:7})."

# 1. Database backup before any migration (TASK 2 Requirement)
BACKUP_DIR="/opt/smartcookie-backups"
sudo mkdir -p "$BACKUP_DIR"
sudo chmod 700 "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/smartcookie_backup_$TIMESTAMP.sql"

echo_info "Creating secure pre-update database backup..."
if ! sudo mysqldump --single-transaction smartcookie > "$BACKUP_FILE" 2>/dev/null; then
    # Parse backup details from DATABASE_URL as fallback
    if [ -f ".env" ]; then
        DB_URL_LINE=$(grep "^DATABASE_URL=" .env | head -n1 | tr -d '"' | tr -d "'")
        DB_URL_CLEAN="${DB_URL_LINE#DATABASE_URL=}"
        DB_USER=$(echo "$DB_URL_CLEAN" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
        DB_PASS=$(echo "$DB_URL_CLEAN" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
        DB_HOST=$(echo "$DB_URL_CLEAN" | sed -n 's|.*@\([^:/]*\).*|\1|p')
        DB_PORT=$(echo "$DB_URL_CLEAN" | sed -E -n 's|.*:([0-9]+)/.*|\1|p')
        DB_NAME=$(echo "$DB_URL_CLEAN" | sed -E -n 's|.*/([^?]+).*|\1|p')
        
        DB_USER=${DB_USER:-"smartcookie"}
        DB_HOST=${DB_HOST:-"127.0.0.1"}
        DB_PORT=${DB_PORT:-"3306"}
        DB_NAME=${DB_NAME:-"smartcookie"}
        
        if ! mysqldump -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
            echo_error "Database backup FAILED! Aborting update to protect data."
            exit 1
        fi
    else
        echo_error "No .env configuration found and default database backup failed! Aborting update."
        exit 1
    fi
fi
sudo chmod 600 "$BACKUP_FILE"
echo_success "Database backup successfully created: $BACKUP_FILE"

# 2. Hard reset local codebase to match remote main (TASK 2 Requirement)
echo_info "Resetting local branch to match origin/main..."
if ! git reset --hard origin/main; then
    echo_error "Git reset FAILED! Aborting update."
    exit 1
fi

# 3. Update dependencies and regenerate Prisma client
echo_info "Installing npm packages and updating dependencies..."
if ! npm install; then
    echo_error "npm install FAILED! Aborting update."
    exit 1
fi

echo_info "Regenerating Prisma client..."
if ! npx prisma generate --schema=server/prisma/schema.prisma; then
    echo_warning "Prisma client generation failed during post-install. Retrying explicitly..."
    if ! npx prisma generate --schema=server/prisma/schema.prisma; then
        echo_error "Prisma client generation FAILED! Aborting update."
        exit 1
    fi
fi

# 4. Apply migrations deploy (TASK 2 Requirement)
echo_info "Deploying database migrations..."
if ! npx prisma migrate deploy --schema=server/prisma/schema.prisma; then
    echo_error "Database migration FAILED! Aborting update to prevent schema mismatch."
    echo "========================================================================="
    echo "                      MIGRATION FAILURE RECOVERY                         "
    echo "========================================================================="
    echo "The schema migration failed. Your running application has been preserved."
    echo "Your database schema remains restorable via the pre-update backup at:"
    echo "  --> $BACKUP_FILE"
    echo ""
    echo "Please resolve the migration conflict, or restore your database using:"
    echo "  mysql -u root smartcookie < $BACKUP_FILE"
    echo "========================================================================="
    exit 1
fi
echo_success "Database migrations successfully deployed."

# 5. Build into a temporary directory to avoid partial-state breakages (TASK 2 Requirement)
echo_info "Compiling application in a temporary directory (dist.new)..."
rm -rf dist.new

# Compile frontend assets into dist.new
if ! npx vite build --outDir dist.new; then
    echo_error "Frontend build failed! The live dist/ directory remains untouched."
    rm -rf dist.new
    exit 1
fi

# Compile server bundle into dist.new/server.cjs
if ! npx esbuild server/src/index.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist.new/server.cjs; then
    echo_error "Backend compilation failed! The live dist/ directory remains untouched."
    rm -rf dist.new
    exit 1
fi

# Build successful - perform atomic replacement of the active dist/ directory
echo_info "Build successful. Replacing active dist/ directory..."
rm -rf dist.bak
if [ -d "dist" ]; then
    mv dist dist.bak
fi
mv dist.new dist
echo_success "Application build updated successfully."

# 6. Restart systemd background service
echo_info "Restarting SmartCookie service to load the update..."
if ! sudo systemctl restart smartcookie.service; then
    echo_error "Failed to restart smartcookie.service!"
    exit 1
fi

# 7. Health check with timeout and diagnosis report (TASK 2 Requirement)
echo_info "Performing live service health check..."
HEALTH_SUCCESS=false
for i in {1..15}; do
    if curl -s --fail http://localhost:3000/api/health | grep -q "ok"; then
        HEALTH_SUCCESS=true
        break
    fi
    sleep 2
done

if [ "$HEALTH_SUCCESS" = "true" ]; then
    # Clean up the previous working build backup now that we are confirmed healthy
    rm -rf dist.bak
    echo "===================================================="
    echo_success "SmartCookie LMS Update Completed Successfully!"
    echo "===================================================="
    echo "Active Commit:  $REMOTE_HEAD"
    echo "Database state: Migrated & Backup Saved"
    echo "Health status:  Healthy"
    echo "===================================================="
else
    echo_error "Health check failed after update!"
    if [ -d "dist.bak" ]; then
        echo_warning "Automatically rolling back to the previous working build..."
        rm -rf dist
        mv dist.bak dist
        if sudo systemctl restart smartcookie.service; then
            echo_success "Rollback successful. Previous version is running."
        else
            echo_error "Failed to restart service during rollback!"
        fi
    else
        echo_warning "No previous build backup (dist.bak) exists. Cannot roll back."
    fi

    echo "========================================================================="
    echo "                      SERVICE HEALTH CHECK FAILURE                       "
    echo "========================================================================="
    echo "The application did not report healthy at http://localhost:3000/api/health"
    echo "Your database was migrated. A secure pre-update backup exists at:"
    echo "  --> $BACKUP_FILE"
    echo ""
    echo "Please diagnose the failure using the system journal:"
    echo "  sudo journalctl -u smartcookie.service -n 50 --no-pager"
    echo "========================================================================="
    exit 1
fi
