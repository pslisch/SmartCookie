#!/usr/bin/env bash

# deploy/04-setup-service.sh - Systemd service compilation and installation.
# Compiles a custom systemd service configuration file, copies it to 
# systemd directories, enables boot auto-starts, and boots up SmartCookie.

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

echo "===================================================="
echo "          SmartCookie Systemd Service Installer    "
echo "===================================================="

# Ensure running with sudo access
if [ "$EUID" -ne 0 ]; then
    echo_error "This script must be run with sudo privileges."
    exit 1
fi

# Locate directories and execution targets
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TEMPLATE_FILE="$SCRIPT_DIR/templates/smartcookie.service"
if [ ! -f "$TEMPLATE_FILE" ]; then
    TEMPLATE_FILE="deploy/templates/smartcookie.service"
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo_error "Systemd template file not found at $TEMPLATE_FILE!"
    exit 1
fi

# Determine the standard user to execute the service (security boundary)
REAL_USER="${SUDO_USER:-root}"
if [ "$REAL_USER" = "root" ]; then
    # Fallback search if SUDO_USER is missing or is root
    REAL_USER=$(logname 2>/dev/null || echo "root")
fi

# Resolve Node.js absolute path (standard pathing might change on VPS systems)
NODE_PATH=$(which node || echo "/usr/bin/node")

if [ ! -x "$NODE_PATH" ]; then
    echo_error "Node.js executable not found or not executable at '$NODE_PATH'!"
    exit 1
fi

SERVICE_FILE="/etc/systemd/system/smartcookie.service"

echo_info "Compiling systemd configuration..."
echo_info "  User:             $REAL_USER"
echo_info "  Working Dir:      $PROJECT_ROOT"
echo_info "  Node Executable:  $NODE_PATH"

# Perform substitutions from template and write to the systemd folder
sudo sed \
  -e "s|USER_PLACEHOLDER|$REAL_USER|g" \
  -e "s|WORKING_DIR_PLACEHOLDER|$PROJECT_ROOT|g" \
  -e "s|NODE_PATH_PLACEHOLDER|$NODE_PATH|g" \
  "$TEMPLATE_FILE" | sudo tee "$SERVICE_FILE" > /dev/null

# Set correct permissions for security
sudo chmod 644 "$SERVICE_FILE"

# Restart systemd daemon and activate service
echo_info "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo_info "Enabling SmartCookie service on system boot..."
sudo systemctl enable smartcookie.service >/dev/null 2>&1

echo_info "Starting SmartCookie service..."
sudo systemctl restart smartcookie.service

# Verify service is running
sleep 2 # Let the server initialize briefly before checking status
if systemctl is-active --quiet smartcookie.service; then
    echo_success "SmartCookie systemd service is active and running!"
    echo "----------------------------------------------------"
    sudo systemctl status smartcookie.service --no-pager | head -n 15
    echo "----------------------------------------------------"
else
    echo_error "SmartCookie systemd service failed to start! Checking logs..."
    echo "----------------------------------------------------"
    sudo journalctl -u smartcookie.service -n 20 --no-pager
    echo "----------------------------------------------------"
    exit 1
fi

echo "===================================================="
echo_success "Systemd service successfully configured and running!"
echo "===================================================="
