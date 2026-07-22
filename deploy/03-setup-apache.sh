#!/usr/bin/env bash

# deploy/03-setup-apache.sh - Apache Reverse Proxy & Let's Encrypt SSL Setup.
# This script configures Apache as a high-density frontend proxy, manages
# firewall ingress rules, and provisions a trusted Certbot SSL certificate.

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

echo "===================================================="
echo "          SmartCookie Apache & SSL Setup            "
echo "===================================================="

DOMAIN="$1"
EMAIL="$2"
if [ -z "$DOMAIN" ]; then
    echo_error "No domain name provided."
    echo "Usage: $0 <domain-name> [email-address]"
    exit 1
fi

# Ensure running with sudo access
if [ "$EUID" -ne 0 ]; then
    echo_error "This script must be run with sudo privileges."
    exit 1
fi

# 1. Enable required Apache modules
echo_info "Enabling required Apache modules..."
sudo a2enmod proxy >/dev/null 2>&1
sudo a2enmod proxy_http >/dev/null 2>&1
sudo a2enmod ssl >/dev/null 2>&1
sudo a2enmod headers >/dev/null 2>&1
echo_success "Required Apache modules enabled."

# 2. Compile VirtualHost configuration from template
TEMPLATE_FILE="$(dirname "$0")/templates/smartcookie.conf"
if [ ! -f "$TEMPLATE_FILE" ]; then
    TEMPLATE_FILE="deploy/templates/smartcookie.conf"
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo_error "VirtualHost template file not found at $TEMPLATE_FILE!"
    exit 1
fi

VHOST_PATH="/etc/apache2/sites-available/smartcookie.conf"

PORT="3000"
if [ -f ".env" ] && grep -q "^PORT=" .env; then
    PORT=$(grep "^PORT=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || echo "3000")
fi

echo_info "Generating Apache configuration at $VHOST_PATH for '$DOMAIN' (proxying to port $PORT)..."
sudo sed \
  -e "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" \
  -e "s/PORT_PLACEHOLDER/$PORT/g" \
  -e "s/127.0.0.1:3000/127.0.0.1:$PORT/g" \
  "$TEMPLATE_FILE" | sudo tee "$VHOST_PATH" > /dev/null

# 3. Enable site and reload Apache
echo_info "Enabling SmartCookie VirtualHost..."
sudo a2ensite smartcookie.conf >/dev/null 2>&1

# Disable default port 80 virtualhost to prevent overlapping ServerName issues
if [ -f "/etc/apache2/sites-enabled/000-default.conf" ]; then
    echo_info "Disabling Apache default site (000-default.conf)..."
    sudo a2dissite 000-default.conf >/dev/null 2>&1
fi

echo_info "Testing Apache configuration syntax..."
if ! sudo apache2ctl configtest; then
    echo_error "Apache configuration is invalid! Please check the settings."
    exit 1
fi

echo_info "Reloading Apache to apply changes..."
sudo systemctl reload apache2
echo_success "Apache reverse-proxy configuration loaded."

# 4. Open firewall ports in UFW if installed
if command -v ufw >/dev/null 2>&1; then
    echo_info "Configuring UFW to allow Apache HTTP and HTTPS traffic..."
    sudo ufw allow 'Apache Full' >/dev/null 2>&1
    sudo ufw allow OpenSSH >/dev/null 2>&1 # Prevent locking out of ssh session
    echo_success "UFW rules updated successfully."
else
    echo_info "UFW is not installed. Skipping firewall configuration."
fi

# 5. Run Certbot to fetch SSL certificates and configure HTTPS redirects
echo_info "Obtaining Let's Encrypt SSL certificate for $DOMAIN..."
echo_info "This may take a minute. Certbot will automatically rewrite your vhost config for HTTPS..."

# Run certbot non-interactively using the Apache plugin
# --register-unsafely-without-email is used if no email is supplied; we also agree to Terms of Service.
# --redirect configures automatic HTTP to HTTPS redirecting in Apache.
CERTBOT_ARGS=("--apache" "-d" "$DOMAIN" "--non-interactive" "--agree-tos" "--redirect")
if [ -n "$EMAIL" ]; then
    CERTBOT_ARGS+=("--email" "$EMAIL")
else
    CERTBOT_ARGS+=("--register-unsafely-without-email")
fi

if ! sudo certbot "${CERTBOT_ARGS[@]}"; then
    echo_error "Certbot was unable to automatically provision SSL for '$DOMAIN'!"
    echo_error "Ensure that your domain is pointing to this server's public IP address, port 80 is open, and there is no firewall blocking Let's Encrypt validation."
    echo_error "Aborting installation as SSL setup failed (Strict Certbot Mode)."
    exit 1
else
    echo_success "Let's Encrypt SSL certificate successfully installed and configured for '$DOMAIN'!"
fi

# 6. Final reload of Apache
echo_info "Performing final Apache configuration validation and reload..."
if sudo apache2ctl configtest >/dev/null 2>&1; then
    sudo systemctl reload apache2
    echo_success "Apache reloaded successfully."
else
    echo_error "Apache configuration syntax check failed after SSL rewrite!"
    exit 1
fi

echo "===================================================="
echo_success "Apache setup and reverse-proxy compilation completed!"
echo_info "SmartCookie reverse-proxy is live at http://$DOMAIN (and https://$DOMAIN if SSL succeeded)."
echo "===================================================="
