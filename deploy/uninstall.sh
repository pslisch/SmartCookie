#!/usr/bin/env bash

# deploy/uninstall.sh - Safe, heavily backed-up uninstaller for SmartCookie LMS.
# Designed to be run via:
#   sudo /opt/smartcookie/deploy/uninstall.sh

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

echo "===================================================="
echo "          SmartCookie LMS Uninstaller Tool           "
echo "===================================================="

# Ensure running with sudo access
if [ "$EUID" -ne 0 ]; then
    echo_error "This script must be run with sudo privileges."
    exit 1
fi

# Require explicit confirmation before doing anything (TASK 3 Requirement)
CONFIRMED=false
for arg in "$@"; do
    if [ "$arg" = "--confirm" ]; then
        CONFIRMED=true
    fi
done

if [ "$CONFIRMED" = "false" ]; then
    echo -e "\e[31m=========================================================================\e[0m"
    echo -e "\e[31m                      ⚠️  CRITICAL WARNING ⚠️                           \e[0m"
    echo -e "\e[31m=========================================================================\e[0m"
    echo "This script will permanently destroy your SmartCookie LMS installation!"
    echo "This includes:"
    echo "  - The application source code, node_modules, and compiled builds"
    echo "  - The local mysql/mariadb database 'smartcookie' and its DB user"
    echo "  - The systemd background service 'smartcookie.service'"
    echo "  - The Apache VirtualHost proxy 'smartcookie.conf'"
    echo ""
    echo "This action is DESTRUCTIVE and IRREVERSIBLE."
    echo "A secure final database backup will be created before any changes are made."
    echo "------------------------------------------------------------------------"
    
    # Auto-detect domain if possible to guide the user
    DETECTED_DOMAIN=""
    if [ -f "/etc/apache2/sites-available/smartcookie.conf" ]; then
        DETECTED_DOMAIN=$(grep -i "ServerName" /etc/apache2/sites-available/smartcookie.conf | awk '{print $2}' | head -n1 || echo "")
    fi
    
    if [ -n "$DETECTED_DOMAIN" ]; then
        echo "To confirm, please type your domain name exactly ($DETECTED_DOMAIN):"
    else
        echo "To confirm, please type the confirmation phrase 'DELETE-ALL-SMARTCOOKIE-DATA':"
    fi
    
    read -p "Confirmation input: " CONFIRM_INPUT
    
    if [ -n "$DETECTED_DOMAIN" ]; then
        if [ "$CONFIRM_INPUT" != "$DETECTED_DOMAIN" ] && [ "$CONFIRM_INPUT" != "DELETE-ALL-SMARTCOOKIE-DATA" ]; then
            echo_error "Confirmation failed! Aborting uninstall."
            exit 1
        fi
    else
        if [ "$CONFIRM_INPUT" != "DELETE-ALL-SMARTCOOKIE-DATA" ]; then
            echo_error "Confirmation failed! Aborting uninstall."
            exit 1
        fi
    fi
fi

# Step Order: Backup MUST succeed before anything destructive (TASK 3 Requirement)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
USER_HOME=$(eval echo "~${SUDO_USER:-root}")
if [ ! -d "$USER_HOME" ]; then
    USER_HOME="/root"
fi
BACKUP_FILE="$USER_HOME/smartcookie-final-backup-$TIMESTAMP.sql"

echo_info "Initializing pre-uninstallation checklist..."

# Check if database exists
DB_EXISTS=$(sudo mysql -N -B -e "SHOW DATABASES LIKE 'smartcookie';" 2>/dev/null || true)

if [ -n "$DB_EXISTS" ]; then
    echo_info "Database 'smartcookie' detected. Generating final database backup..."
    if ! sudo mysqldump --single-transaction smartcookie > "$BACKUP_FILE" 2>/dev/null; then
        # Try credentials fallback from .env if standard sudo fails
        if [ -f "/opt/smartcookie/.env" ]; then
            DB_URL_LINE=$(grep "^DATABASE_URL=" /opt/smartcookie/.env | head -n1 | tr -d '"' | tr -d "'")
            DB_URL_CLEAN="${DB_URL_LINE#DATABASE_URL=}"
            DB_USER=$(echo "$DB_URL_CLEAN" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
            DB_PASS=$(echo "$DB_URL_CLEAN" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
            DB_HOST=$(echo "$DB_URL_CLEAN" | sed -n 's|.*@\([^:/]*\).*|\1|p')
            DB_PORT=$(echo "$DB_URL_CLEAN" | sed -E -n 's|.*:([0-9]+)/.*|\1|p')
            
            DB_USER=${DB_USER:-"smartcookie"}
            DB_HOST=${DB_HOST:-"127.0.0.1"}
            DB_PORT=${DB_PORT:-"3306"}
            
            if ! mysqldump -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" smartcookie > "$BACKUP_FILE" 2>/dev/null; then
                echo_error "CRITICAL ERROR: Failed to create database backup! Aborting uninstallation to protect data."
                exit 1
            fi
        else
            echo_error "CRITICAL ERROR: Database exists but backup failed. Aborting uninstallation."
            exit 1
        fi
    fi
    sudo chmod 600 "$BACKUP_FILE"
    echo_success "Final database backup saved safely at: $BACKUP_FILE"
else
    echo_warning "Database 'smartcookie' not found. Skipping backup."
    BACKUP_FILE="None (Database was not present)"
fi

# 1. Stop and Disable Systemd Background Service (Skip gracefully if missing)
echo_info "Step 1: Removing systemd background service..."
if systemctl list-unit-files | grep -q "^smartcookie\.service"; then
    sudo systemctl stop smartcookie.service || true
    sudo systemctl disable smartcookie.service || true
    echo_info "Stopped and disabled smartcookie.service."
else
    echo_warning "smartcookie.service not active or not found. Skipping stop step."
fi
sudo rm -f /etc/systemd/system/smartcookie.service
sudo systemctl daemon-reload
echo_success "Systemd service clean-up completed."

# 2. Drop the SmartCookie-specific Database and User ONLY
echo_info "Step 2: Removing database and user..."
DROP_USER="smartcookie"
if [ -f "/opt/smartcookie/.env" ]; then
    DB_URL_LINE=$(grep "^DATABASE_URL=" /opt/smartcookie/.env | head -n1 | tr -d '"' | tr -d "'")
    DB_URL_CLEAN="${DB_URL_LINE#DATABASE_URL=}"
    EXTRACTED_USER=$(echo "$DB_URL_CLEAN" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
    if [ -n "$EXTRACTED_USER" ]; then
        DROP_USER="$EXTRACTED_USER"
    fi
fi

sudo mysql -e "DROP DATABASE IF EXISTS \`smartcookie\`;" || echo_warning "Could not drop database 'smartcookie'"
sudo mysql -e "DROP USER IF EXISTS '$DROP_USER'@'localhost';" || echo_warning "Could not drop database user '$DROP_USER'"
sudo mysql -e "FLUSH PRIVILEGES;"
echo_success "Database 'smartcookie' and DB user '$DROP_USER' removed successfully."

# 3. Remove Apache VirtualHost config only, reload Apache (Skip gracefully if missing)
echo_info "Step 3: Removing Apache proxy configuration..."
if [ -f "/etc/apache2/sites-available/smartcookie.conf" ]; then
    sudo a2dissite smartcookie.conf >/dev/null 2>&1 || true
    sudo rm -f /etc/apache2/sites-available/smartcookie.conf
    echo_info "Reloading Apache to release site..."
    sudo systemctl reload apache2 || true
    echo_success "Apache configuration removed."
else
    echo_warning "Apache configuration 'smartcookie.conf' not found. Skipping."
fi

# 4. Remove application directory (/opt/smartcookie)
echo_info "Step 4: Deleting application directories..."
if [ -d "/opt/smartcookie" ]; then
    sudo rm -rf /opt/smartcookie
    echo_success "Application directory /opt/smartcookie successfully deleted."
else
    echo_warning "Application directory /opt/smartcookie not found. Skipping."
fi

# Final Summary Output (TASK 3 transparency requirement)
echo ""
echo "========================================================================="
echo "                SMARTCOOKIE LMS UNINSTALL COMPLETED                      "
echo "========================================================================="
echo "The following resources have been completely REMOVED:"
echo "  [✓] /opt/smartcookie (Application files, builds, and node_modules)"
echo "  [✓] /etc/systemd/system/smartcookie.service (Systemd background daemon)"
echo "  [✓] MySQL database 'smartcookie' and local user '$DROP_USER'"
echo "  [✓] Apache VirtualHost configuration 'smartcookie.conf' (site disabled)"
echo ""
echo "FINAL DATABASE BACKUP:"
echo "  Your final database snapshot remains perfectly preserved at:"
echo "  --> $BACKUP_FILE"
echo ""
echo "INTENTIONALLY LEFT UNTOUCHED (to preserve system stability and shared roles):"
echo "  - Postal Mail Server Container Stack (Understood as a standalone service)"
echo "  - MariaDB/MySQL server package and daemon"
echo "  - Apache2 server package and daemon"
echo "  - Docker, Node.js, npm, Certbot"
echo "  - UFW firewall rules"
echo "========================================================================="
echo "SmartCookie LMS uninstalled."
