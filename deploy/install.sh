#!/usr/bin/env bash

# deploy/install.sh - Master Orchestrator Script for SmartCookie Deployment.
# This script manages the full pipeline, executing individual scripts in
# sequence, managing manual checkpoints, updating SMTP settings, and loading system services.

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

# Locate directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "===================================================="
echo "          SmartCookie LMS Full Deployment Pipeline  "
echo "===================================================="

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
    echo_error "No domain name provided."
    echo "Usage: sudo $0 <domain-name>"
    exit 1
fi

# Ensure running with sudo access
if [ "$EUID" -ne 0 ]; then
    echo_error "This script must be run with sudo privileges."
    exit 1
fi

# Prompt early for mail server path
echo "===================================================="
echo "Do you already have a mail server to connect to,"
echo "or should this set up a new self-hosted one (Postal)?"
echo "  1) Set up a new self-hosted mail server (Postal)"
echo "  2) Connect to an existing external mail server"
echo "===================================================="
read -p "Select option [1 or 2, default: 1]: " MAIL_OPTION
if [ "$MAIL_OPTION" = "2" ]; then
    MAIL_MODE="existing"
    echo_info "Selected Path B: Connect to an existing mail server."
else
    MAIL_MODE="new"
    echo_info "Selected Path A: Set up a new self-hosted mail server (Postal)."
fi

cd "$PROJECT_ROOT"

# Ensure all scripts are executable
chmod +x "$SCRIPT_DIR"/*.sh

# Run Stage-by-Stage with explicit ✓/✗ reporting
echo "----------------------------------------------------"
echo_info "STAGE 1: Running Pre-flight verification..."
if ! "$SCRIPT_DIR/00-preflight.sh" "$DOMAIN" "$MAIL_MODE"; then
    echo_error "Pre-flight verification failed! Halted."
    exit 1
fi
echo_success "Stage 1: Pre-flight checks passed."

echo "----------------------------------------------------"
echo_info "STAGE 2: Setting up SmartCookie Database..."
if ! "$SCRIPT_DIR/01-setup-database.sh"; then
    echo_error "Database setup failed! Halted."
    exit 1
fi
echo_success "Stage 2: Database and user set up successfully."

echo "----------------------------------------------------"
echo_info "STAGE 3: Installing dependencies and building app..."
if ! "$SCRIPT_DIR/02-install-app.sh"; then
    echo_error "App installation or compilation failed! Halted."
    exit 1
fi
echo_success "Stage 3: Application built successfully."

echo "----------------------------------------------------"
echo_info "STAGE 4: Setting up Apache Reverse Proxy & SSL..."
if ! "$SCRIPT_DIR/03-setup-apache.sh" "$DOMAIN"; then
    echo_error "Apache configuration or SSL certificate retrieval failed! Halted."
    exit 1
fi
echo_success "Stage 4: Apache reverse proxy and SSL established."

echo "----------------------------------------------------"
echo_info "STAGE 5: Registering systemd Service..."
if ! "$SCRIPT_DIR/04-setup-service.sh"; then
    echo_error "Systemd service registration failed! Halted."
    exit 1
fi
echo_success "Stage 5: systemd background service launched."

if [ "$MAIL_MODE" = "new" ]; then
    echo "----------------------------------------------------"
    echo_info "STAGE 6: Setting up Postal Mail Server..."
    if ! "$SCRIPT_DIR/05-setup-mail.sh" "$DOMAIN" "new"; then
        echo_error "Postal mail server installation failed! Halted."
        exit 1
    fi
    echo_success "Stage 6: Postal container stack initialized."

    echo "----------------------------------------------------"
    echo_info "STAGE 7: Compiling DNS Configuration Guide..."
    if ! "$SCRIPT_DIR/06-generate-dns-guide.sh" "$DOMAIN"; then
        echo_error "DNS Guide compilation failed! Halted."
        exit 1
    fi
    echo_success "Stage 7: DNS Setup Guide generated in 'deploy/DNS_SETUP.md'."

    # Honest checkpoint for manual setup (DNS + Web UI)
    echo ""
    echo "========================================================================="
    echo "        ⚠️  MANUAL CONFIGURATION AND PROPAGATION CHECKPOINT             "
    echo "========================================================================="
    echo "The SmartCookie server and Postal mail services are now fully running,"
    echo "but outbound emails cannot be safely delivered until DNS is configured."
    echo ""
    echo "ACTION REQUIRED RIGHT NOW:"
    echo "  1. Open your DNS provider and configure the records listed in:"
    echo "     --> deploy/DNS_SETUP.md"
    echo ""
    echo "  2. Access the Postal Web Console at: http://postal.$DOMAIN"
    echo "     - Log in using the admin account you just created."
    echo "     - Create your first Organization (e.g. 'SmartCookie LMS')."
    echo "     - Create a Mail Server (e.g. 'smartcookie-relay')."
    echo "     - Add your domain '$DOMAIN' to the server."
    echo "     - Go to 'Credentials' and click 'Create Credential'."
    echo "       Create an SMTP credential and note the Username and Password."
    echo "========================================================================="
    echo ""
    read -p "Press [ENTER] once you have generated SMTP credentials in Postal to continue..."

    # 8. Gathers SMTP details and wires them directly into .env (Task 9)
    echo ""
    echo "----------------------------------------------------"
    echo_info "STAGE 8: Wiring Postal SMTP into SmartCookie..."
    echo "----------------------------------------------------"

    read -p "Enter Postal SMTP Host [default: 127.0.0.1]: " SMTP_HOST
    SMTP_HOST=${SMTP_HOST:-"127.0.0.1"}

    read -p "Enter Postal SMTP Port [default: 25]: " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-"25"}

    read -p "Enter Postal SMTP Username: " SMTP_USER
    while [ -z "$SMTP_USER" ]; do
        echo_warning "SMTP Username cannot be empty."
        read -p "Enter Postal SMTP Username: " SMTP_USER
    done

    read -s -p "Enter Postal SMTP Password: " SMTP_PASS
    echo ""
    while [ -z "$SMTP_PASS" ]; do
        echo_warning "SMTP Password cannot be empty."
        read -s -p "Enter Postal SMTP Password: " SMTP_PASS
        echo ""
    done

    SMTP_FROM="no-reply@$DOMAIN"

    # Securely write SMTP variables to .env
    echo_info "Updating SMTP settings in .env..."
    sed -i "s|^SMTP_HOST=.*|SMTP_HOST=\"$SMTP_HOST\"|g" .env
    sed -i "s|^SMTP_PORT=.*|SMTP_PORT=\"$SMTP_PORT\"|g" .env
    sed -i "s|^SMTP_USER=.*|SMTP_USER=\"$SMTP_USER\"|g" .env
    sed -i "s|^SMTP_PASS=.*|SMTP_PASS=\"$SMTP_PASS\"|g" .env
    sed -i "s|^SMTP_FROM=.*|SMTP_FROM=\"$SMTP_FROM\"|g" .env

    # Restart systemd service to pick up configuration changes
    echo_info "Restarting SmartCookie service to load SMTP settings..."
    sudo systemctl restart smartcookie.service
    echo_success "SmartCookie has been re-booted with Postal relay credentials!"

    # Final compilation of the DNS guide to verify any added DKIM key
    echo_info "Re-running DNS guide generator to ensure the active DKIM key is captured..."
    "$SCRIPT_DIR/06-generate-dns-guide.sh" "$DOMAIN" >/dev/null 2>&1 || true

    echo "===================================================="
    echo "          COMPLETED DEPLOYMENT PIPELINE SUCCESSFUL  "
    echo "===================================================="
    echo "Your SmartCookie platform is now fully configured and running!"
    echo ""
    echo "ACCESS DETAILS:"
    echo "  - Platform URL:      https://$DOMAIN (HTTP-redirected)"
    echo "  - Postal Admin UI:   http://postal.$DOMAIN"
    echo ""
    echo "Check your DNS setup guide at 'deploy/DNS_SETUP.md' for production configurations."
    echo "===================================================="

else
    # Path B: Connect existing
    echo "----------------------------------------------------"
    echo_info "STAGE 6: Configuring Connection to Existing Mail Server..."
    if ! "$SCRIPT_DIR/05-setup-mail.sh" "$DOMAIN" "existing"; then
        echo_error "SMTP configuration and validation failed! Halted."
        exit 1
    fi
    echo_success "Stage 6: Existing SMTP mail server configured and verified."

    echo "----------------------------------------------------"
    echo_info "STAGE 7: Skipping DNS Guide Compilation (Connect Existing path)..."
    echo_info "STAGE 8: Skipping SMTP Credential Checkpoint (Already configured and verified)..."
    echo "----------------------------------------------------"

    # Restart systemd service to load the validated SMTP settings from .env
    echo_info "Restarting SmartCookie service to load verified SMTP settings..."
    sudo systemctl restart smartcookie.service
    echo_success "SmartCookie has been re-booted with your verified SMTP credentials!"

    echo "===================================================="
    echo "          COMPLETED DEPLOYMENT PIPELINE SUCCESSFUL  "
    echo "===================================================="
    echo "Your SmartCookie platform is now fully configured and running!"
    echo ""
    echo "ACCESS DETAILS:"
    echo "  - Platform URL:      https://$DOMAIN (HTTP-redirected)"
    echo "===================================================="
fi
