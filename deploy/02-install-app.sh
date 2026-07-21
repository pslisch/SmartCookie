#!/usr/bin/env bash

# deploy/02-install-app.sh - Package installation, database migration, and build.
# This script ensures dependencies are loaded, Prisma production migrations run, 
# and the production server and frontend are compiled.

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

# Locate project root dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "===================================================="
echo "          SmartCookie Dependency Install & Build    "
echo "===================================================="

cd "$PROJECT_ROOT"

# Ensure .env is present before running migrations
if [ ! -f ".env" ]; then
    echo_error ".env configuration file is missing!"
    echo "Please run '01-setup-database.sh' first to configure database settings."
    exit 1
fi

echo_info "Running npm install..."
# npm install will trigger 'npm run postinstall' which runs 'prisma generate'
if [ "${SC_LOW_MEM:-false}" = "true" ]; then
    echo_info "Low-memory mode active: running npm install with JOBS=1 to limit parallel compilation..."
    if ! JOBS=1 npm install; then
        echo_error "npm install failed!"
        exit 1
    fi
else
    if ! npm install; then
        echo_error "npm install failed!"
        exit 1
    fi
fi
echo_success "npm dependencies installed and Prisma Client generated."

echo_info "Running database schema migrations..."
# Run 'prisma migrate deploy' which runs pending migrations in production mode without resetting the DB.
if ! npx prisma migrate deploy; then
    echo_error "Database migration failed!"
    exit 1
fi
echo_success "Database migrations successfully applied."

echo_info "Compiling production assets (Vite frontend & Node server bundle)..."
if ! npm run build; then
    echo_error "Production compilation failed!"
    exit 1
fi
echo_success "Application built successfully! (Frontend in dist/, Server in dist/server.cjs)"

echo "===================================================="
echo_success "Installation and production build completed!"
echo "===================================================="
