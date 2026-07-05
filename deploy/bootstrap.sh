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

DOMAIN="$1"
EMAIL="$2"

if [ -z "$DOMAIN" ]; then
    echo_error "No domain name provided."
    echo "Usage: curl -fsSL ... | sudo bash -s -- <domain-name> [email-address]"
    exit 1
fi

# Ensure running with sudo access
if [ "$EUID" -ne 0 ]; then
    echo_error "This script must be run with sudo privileges."
    exit 1
fi

INSTALL_DIR="/opt/smartcookie"

# Check if target directory already exists (TASK 1 Requirement)
if [ -d "$INSTALL_DIR" ]; then
    echo_error "SmartCookie is already installed at $INSTALL_DIR!"
    echo "To update your existing installation, please run:"
    echo "  sudo $INSTALL_DIR/deploy/update.sh"
    echo ""
    echo "If you want to perform a clean re-installation, please run the uninstall script first:"
    echo "  sudo $INSTALL_DIR/deploy/uninstall.sh"
    exit 1
fi

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

# Change directory and transfer execution to install.sh
cd "$INSTALL_DIR"

echo_info "Executing production deployment orchestrator..."
exec ./deploy/install.sh "$DOMAIN" "$EMAIL"
