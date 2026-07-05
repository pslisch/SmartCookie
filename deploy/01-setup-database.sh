#!/usr/bin/env bash

# deploy/01-setup-database.sh - Database setup for SmartCookie LMS.
# This script uses native mysql admin privileges via unix_socket to create
# a secure, private database and database user.

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

DB_NAME="smartcookie"
DB_USER="smartcookie"

echo "===================================================="
echo "          SmartCookie Database Setup & Configuration "
echo "===================================================="

# Check if .env already exists and contains a set DATABASE_URL
if [ -f ".env" ] && grep -q "^DATABASE_URL=" .env && ! grep -q "DATABASE_URL=\"mysql://smartcookie:smartcookie_pass" .env; then
    echo_success "An existing .env file with a customized DATABASE_URL was found."
    echo_info "Skipping database user/password creation to prevent overwriting existing credentials."
    exit 0
fi

# Ensure .env exists (copy from example if missing)
if [ ! -f ".env" ]; then
    echo_info "No .env file found. Creating .env from .env.example..."
    cp .env.example .env
    chmod 600 .env
fi

# Generate a high-entropy password for the database user
# Secrets are generated randomly and kept private (chmod 600)
DB_PASS=$(openssl rand -hex 16)

echo_info "Configuring MariaDB/MySQL database and user..."

# Check if database or user already exists to report existing state
DB_EXISTS=$(sudo mysql -N -B -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null || true)
USER_EXISTS=$(sudo mysql -N -B -e "SELECT User FROM mysql.user WHERE User='$DB_USER' AND Host='localhost';" 2>/dev/null || true)

if [ -n "$DB_EXISTS" ]; then
    echo_info "Database '$DB_NAME' already exists. Re-verifying privileges..."
else
    echo_info "Creating database '$DB_NAME'..."
fi

# Create database if not exists with UTF-8 support
sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Ensure user exists and has correct password assigned
if [ -n "$USER_EXISTS" ]; then
    echo_warning "Database user '$DB_USER' already exists. Resetting password for consistency with this deployment."
else
    echo_info "Creating database user '$DB_USER'..."
fi

# Create user if not exists and assign password (idempotent + safe)
sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
sudo mysql -e "ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Format the Prisma DATABASE_URL
DATABASE_URL="mysql://$DB_USER:$DB_PASS@127.0.0.1:3306/$DB_NAME"

# Safely write DATABASE_URL to .env without duplicate keys
if grep -q "^DATABASE_URL=" .env; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|g" .env
else
    echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env
fi

# Also replace placeholder SESSION_SECRET if it has default value
if grep -q "^SESSION_SECRET=\"some-long-random-string" .env; then
    RAND_SECRET=$(openssl rand -hex 32)
    sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=\"$RAND_SECRET\"|g" .env
    echo_info "Generated a random security SESSION_SECRET inside .env."
fi

# Secure the .env file permissions
chmod 600 .env

echo "===================================================="
echo_success "Database setup and .env configuration completed."
echo_info "Privileges flushed. Connection URL saved securely in .env."
echo "===================================================="
