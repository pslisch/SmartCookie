#!/usr/bin/env bash

# deploy/bootstrap.sh - One-line bootstrap script for SmartCookie LMS.
# Designed to be run via:
#   curl -fsSL https://raw.githubusercontent.com/.../deploy/bootstrap.sh | sudo bash -s -- <domain> [email]

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

echo "===================================================="
echo "          SmartCookie LMS Bootstrapper              "
echo "===================================================="

# Ensure running with sudo access
if [ "$EUID" -ne 0 ]; then
    echo_error "This script must be run with sudo privileges."
    exit 1
fi

# Store arguments if provided
DOMAIN_ARG="$1"
EMAIL_ARG="$2"

# 1. Ask if they want to setup Apache server
read -p "Do you want to setup an Apache web server as a reverse proxy with Let's Encrypt SSL? [Y/n]: " SETUP_APACHE_INPUT < /dev/tty
SETUP_APACHE_INPUT=${SETUP_APACHE_INPUT:-"y"}
if [[ "$SETUP_APACHE_INPUT" =~ ^[yY] ]]; then
    SETUP_APACHE="true"
else
    SETUP_APACHE="false"
fi

# 2. Ask for domain name
DOMAIN="$DOMAIN_ARG"
EMAIL="$EMAIL_ARG"

if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain name (e.g. yourdomain.com): " DOMAIN < /dev/tty
    while [ -z "$DOMAIN" ]; do
        echo_warning "Domain name is required."
        read -p "Enter your domain name (e.g. yourdomain.com): " DOMAIN < /dev/tty
    done
fi

# 3. If yes (setup apache), ask for path
INSTALL_DIR="/opt/smartcookie" # default fallback
if [ "$SETUP_APACHE" = "true" ]; then
    echo "----------------------------------------------------"
    echo "Configure installation directory path:"
    echo "  1) Leave default: /opt/smartcookie"
    echo "  2) /var/www/"
    echo "  3) /var/www/{path extension}"
    echo "  4) Custom: Enter full absolute path"
    echo "----------------------------------------------------"
    read -p "Select path option [1-4, default: 1]: " PATH_OPTION < /dev/tty
    PATH_OPTION=${PATH_OPTION:-"1"}

    if [ "$PATH_OPTION" = "1" ]; then
        INSTALL_DIR="/opt/smartcookie"
    elif [ "$PATH_OPTION" = "2" ]; then
        INSTALL_DIR="/var/www/"
    elif [ "$PATH_OPTION" = "3" ]; then
        # If option 3: to subpath "/var/www/{path extension entered by user}"
        read -p "Enter path extension (creating /var/www/{extension}): " PATH_EXT < /dev/tty
        while [ -z "$PATH_EXT" ]; do
            echo_warning "Path extension cannot be empty."
            read -p "Enter path extension (creating /var/www/{extension}): " PATH_EXT < /dev/tty
        done
        INSTALL_DIR="/var/www/$PATH_EXT"
    elif [ "$PATH_OPTION" = "4" ]; then
        # If option 4: custom (User writes the full path)
        read -p "Enter full absolute path for installation: " CUSTOM_PATH < /dev/tty
        while [ -z "$CUSTOM_PATH" ] || [[ ! "$CUSTOM_PATH" =~ ^/ ]]; do
            echo_warning "A valid absolute path starting with / is required."
            read -p "Enter full absolute path for installation: " CUSTOM_PATH < /dev/tty
        done
        INSTALL_DIR="$CUSTOM_PATH"
    else
        INSTALL_DIR="/opt/smartcookie"  # new default fallback, was /var/www/
    fi
else
    # If SETUP_APACHE is false, we can prompt for custom path or use default /opt/smartcookie
    read -p "Do you want to use a custom installation directory instead of /opt/smartcookie? [y/N]: " CUSTOM_DIR_INPUT < /dev/tty
    CUSTOM_DIR_INPUT=${CUSTOM_DIR_INPUT:-"n"}
    if [[ "$CUSTOM_DIR_INPUT" =~ ^[yY] ]]; then
        read -p "Enter full absolute path for installation: " CUSTOM_PATH < /dev/tty
        while [ -z "$CUSTOM_PATH" ] || [[ ! "$CUSTOM_PATH" =~ ^/ ]]; do
            echo_warning "A valid absolute path starting with / is required."
            read -p "Enter full absolute path for installation: " CUSTOM_PATH < /dev/tty
        done
        INSTALL_DIR="$CUSTOM_PATH"
    fi
fi

# Check if target directory already exists (TASK 1 Requirement)
if [ -d "$INSTALL_DIR" ] && [ "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
    echo_error "SmartCookie target directory $INSTALL_DIR already exists and is not empty!"
    echo "To update your existing installation, please run:"
    echo "  sudo $INSTALL_DIR/deploy/update.sh"
    echo ""
    echo "If you want to perform a clean re-installation, please run the uninstall script first:"
    echo "  sudo $INSTALL_DIR/deploy/uninstall.sh"
    exit 1
fi

# Ensure parent directory of INSTALL_DIR exists
mkdir -p "$(dirname "$INSTALL_DIR")"

# Determine Repository URL - fallback to placeholder or detect from local directory if run locally
REPO_URL="https://github.com/pslisch/SmartCookie.git"
if [ -d ".git" ]; then
    DETECTED_URL=$(git config --get remote.origin.url 2>/dev/null || true)
    if [ -n "$DETECTED_URL" ]; then
        REPO_URL="$DETECTED_URL"
    fi
fi

echo_info "Cloning SmartCookie LMS repository into $INSTALL_DIR..."
if ! git clone "$REPO_URL" "$INSTALL_DIR"; then
    echo_error "Failed to clone repository from $REPO_URL!"
    exit 1
fi

echo_success "Repository successfully cloned to $INSTALL_DIR."

chmod +x "$INSTALL_DIR"/deploy/*.sh

# Change directory and transfer execution to install.sh
cd "$INSTALL_DIR"

# Ensure we ask for email if SSL is being set up and it's missing
if [ -z "$EMAIL" ] && [ "$SETUP_APACHE" = "true" ]; then
    read -p "Enter your email address (optional, for SSL expiration notifications): " EMAIL < /dev/tty
fi

echo_info "Executing production deployment orchestrator..."
export SETUP_APACHE
exec ./deploy/install.sh "$DOMAIN" "$EMAIL"
