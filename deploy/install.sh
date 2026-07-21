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

DOMAIN=""
EMAIL=""
FAST_MODE=false

for arg in "$@"; do
    if [ "$arg" = "--fast" ]; then
        FAST_MODE=true
    elif [ -z "$DOMAIN" ]; then
        DOMAIN="$arg"
    elif [ -z "$EMAIL" ]; then
        EMAIL="$arg"
    fi
done

if [ -z "$DOMAIN" ]; then
    echo_error "No domain name provided."
    echo "Usage: sudo $0 <domain-name> [email-address] [--fast]"
    exit 1
fi

if [ "$FAST_MODE" = "true" ]; then
    echo_info "Running in fast mode - guidance skipped"
else
    echo_info "Running in guided mode - use --fast next time to skip explanations"
fi

# Ensure running with sudo access
if [ "$EUID" -ne 0 ]; then
    echo_error "This script must be run with sudo privileges."
    exit 1
fi

cd "$PROJECT_ROOT"

# Ensure all scripts are executable
chmod +x "$SCRIPT_DIR"/*.sh

# Run Stage-by-Stage with explicit ✓/✗ reporting
echo "----------------------------------------------------"
echo_info "STAGE 1: Running Pre-flight verification..."
if ! "$SCRIPT_DIR/00-preflight.sh" "$DOMAIN" "$FAST_MODE"; then
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

# Write the actual domain into .env as APP_URL
echo_info "Persisting real domain to .env as APP_URL..."
if [ -f ".env" ]; then
    if grep -q "^APP_URL=" .env; then
        sed -i "s|^APP_URL=.*|APP_URL=\"https://$DOMAIN\"|g" .env
    else
        echo "APP_URL=\"https://$DOMAIN\"" >> .env
    fi
fi

echo "----------------------------------------------------"
echo_info "STAGE 3: Installing dependencies and building app..."
SC_LOW_MEM=false
if [ -f /tmp/sc_low_mem ]; then
    SC_LOW_MEM=true
    echo_info "Low-memory condition detected. Passing limit-parallelism flag to compiler."
fi
if ! SC_LOW_MEM="$SC_LOW_MEM" "$SCRIPT_DIR/02-install-app.sh"; then
    echo_error "App installation or compilation failed! Halted."
    exit 1
fi
echo_success "Stage 3: Application built successfully."

echo "----------------------------------------------------"
if [ "$SETUP_APACHE" = "false" ]; then
    echo_info "STAGE 4: Skipping Apache Reverse Proxy & SSL (disabled via installation preferences)..."
else
    echo_info "STAGE 4: Setting up Apache Reverse Proxy & SSL..."
    if ! "$SCRIPT_DIR/03-setup-apache.sh" "$DOMAIN" "$EMAIL"; then
        echo_error "Apache configuration or SSL certificate retrieval failed! Halted."
        exit 1
    fi
    echo_success "Stage 4: Apache reverse proxy and SSL established."
fi

echo "----------------------------------------------------"
echo_info "STAGE 5: Registering systemd Service..."
if ! "$SCRIPT_DIR/04-setup-service.sh"; then
    echo_error "Systemd service registration failed! Halted."
    exit 1
fi
echo_success "Stage 5: systemd background service launched."

echo "===================================================="
echo "          COMPLETED DEPLOYMENT PIPELINE SUCCESSFUL  "
echo "===================================================="
echo "Your SmartCookie platform is now fully configured and running!"
echo ""
echo "ACCESS DETAILS:"
echo "  - Platform URL:      https://$DOMAIN (HTTP-redirected)"
echo ""
echo "Please continue the setup in your browser via the Setup Wizard."
echo "===================================================="

