#!/usr/bin/env bash

# deploy/00-preflight.sh - Pre-flight check script for SmartCookie deployment.
# This script is designed to be idempotent and safe to run multiple times.

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

echo "===================================================="
echo "          SmartCookie Deployment Pre-flight Checks  "
echo "===================================================="

DOMAIN="$1"
MAIL_MODE="${2:-new}"

if [ -z "$DOMAIN" ]; then
    echo_error "No domain name provided."
    echo "Usage: $0 <domain-name> [new|existing]"
    exit 1
fi

# 1. Confirm running as a user with sudo access, not raw root blindly
if [ "$EUID" -eq 0 ] && [ -z "$SUDO_USER" ]; then
    echo_error "Running directly as 'root' is not recommended."
    echo "Please log in as a standard user with sudo privileges and run the installer."
    exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
    echo_error "'sudo' command not found. This user requires sudo access."
    exit 1
fi

if ! sudo -n true >/dev/null 2>&1; then
    echo_info "Validating sudo privileges (password may be requested)..."
    if ! sudo -v >/dev/null 2>&1; then
        echo_error "This user does not have active sudo privileges."
        exit 1
    fi
fi
echo_success "Running as user '$(whoami)' with sudo privileges."

# 2. Confirm required commands exist
if [ "$MAIL_MODE" = "existing" ]; then
    REQUIRED_CMDS=(node npm mysql apache2ctl certbot git ufw)
else
    REQUIRED_CMDS=(node npm mysql apache2ctl docker certbot git ufw)
fi
MISSING_CMDS=()

for cmd in "${REQUIRED_CMDS[@]}"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING_CMDS+=("$cmd")
    fi
done

# Check docker compose specifically if on new path
if [ "$MAIL_MODE" != "existing" ]; then
    HAS_DOCKER_COMPOSE=false
    if docker compose version >/dev/null 2>&1; then
        HAS_DOCKER_COMPOSE=true
    elif command -v docker-compose >/dev/null 2>&1; then
        HAS_DOCKER_COMPOSE=true
    else
        MISSING_CMDS+=("docker compose")
    fi
fi

if [ ${#MISSING_CMDS[@]} -ne 0 ]; then
    echo_error "The following required tools/commands are missing on this server:"
    for m in "${MISSING_CMDS[@]}"; do
        echo "  - $m" >&2
    done
    echo "----------------------------------------------------"
    echo "Please install the missing tools using your package manager."
    echo "Example (on Ubuntu):"
    echo "  sudo apt update"
    echo "  sudo apt install -y nodejs npm mariadb-server apache2 certbot git ufw"
    if [ "$MAIL_MODE" != "existing" ]; then
        echo "  # Install Docker per official Docker instructions for Ubuntu."
    fi
    echo "----------------------------------------------------"
    exit 1
fi
echo_success "All required command-line tools are installed."

# 3. Test outbound port 25 (critical SMTP check if on new mail server path)
if [ "$MAIL_MODE" != "existing" ]; then
    echo_info "Testing outbound connectivity on port 25 (SMTP)..."
    # We try to connect to smtp.gmail.com on port 25 with a 5-second timeout
    if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/25' 2>/dev/null; then
        echo_success "Outbound SMTP port 25 is OPEN."
    else
        echo_error "Outbound port 25 (SMTP) is BLOCKED by your VPS provider or firewall."
        echo "========================================================================="
        echo "                      CRITICAL ACTION REQUIRED                           "
        echo "========================================================================="
        echo "SmartCookie uses Postal as an SMTP relay to send transactional emails."
        echo "Many VPS providers (DigitalOcean, Linode, Vultr, Hetzner, AWS, GCP, etc.)"
        echo "block outbound port 25 by default to prevent spam."
        echo ""
        echo "INSTRUCTIONS:"
        echo "1. Log in to your VPS provider's control panel."
        echo "2. Open a support ticket / request to unblock outbound port 25."
        echo "3. Explain that you are deploying a private, authenticated mail server"
        echo "   (Postal) for transactional system notifications."
        echo "4. Once they confirm it has been opened, re-run this pre-flight script."
        echo "========================================================================="
        exit 1
    fi
else
    echo_info "Connecting to an existing mail server. Skipping outbound port 25 SMTP check."
fi

# 4. Confirm the provided domain's DNS A record actually resolves to this server's public IP
echo_info "Retrieving server's public IP and validating DNS record for '$DOMAIN'..."
PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org || curl -s --max-time 5 https://ifconfig.me || echo "")

if [ -z "$PUBLIC_IP" ]; then
    echo_warning "Unable to detect public IP address (IP discovery services timed out)."
    echo_warning "Skipping direct IP mapping validation, but Certbot SSL may fail if misconfigured."
else
    echo_info "Detected server public IP: $PUBLIC_IP"
    
    # Attempt to resolve the domain to an IP address
    RESOLVED_IP=""
    if command -v dig >/dev/null 2>&1; then
        RESOLVED_IP=$(dig +short "$DOMAIN" | tail -n1)
    elif command -v host >/dev/null 2>&1; then
        RESOLVED_IP=$(host "$DOMAIN" | awk '/has address/ { print $4 }' | tail -n1)
    elif command -v nslookup >/dev/null 2>&1; then
        RESOLVED_IP=$(nslookup "$DOMAIN" | awk '/Address:/ {print $2}' | tail -n1)
    fi

    if [ -z "$RESOLVED_IP" ]; then
        RESOLVED_IP=$(getent ahosts "$DOMAIN" | awk '{print $1}' | head -n1 || echo "")
    fi

    if [ -z "$RESOLVED_IP" ]; then
        echo_warning "DNS resolution for '$DOMAIN' failed."
        echo_warning "Ensure that you have created an A record pointing to this server ($PUBLIC_IP)."
    elif [ "$RESOLVED_IP" != "$PUBLIC_IP" ]; then
        echo_warning "Domain '$DOMAIN' resolves to '$RESOLVED_IP', but this server's public IP is '$PUBLIC_IP'."
        echo "  Certbot Let's Encrypt certificate challenge will fail if the domain is not resolving here."
        echo "  If you recently updated DNS, please wait for propagation or verify registrar settings."
    else
        echo_success "Domain '$DOMAIN' correctly resolves to this server's public IP ($PUBLIC_IP)."
    fi
fi

echo "===================================================="
echo_success "Pre-flight checks passed! Ready to proceed."
echo "===================================================="
