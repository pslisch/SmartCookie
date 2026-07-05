#!/usr/bin/env bash

# deploy/05-setup-mail.sh - Setup mail server or connect to an existing SMTP server.
# This script handles both:
#   Path A: Installing a new, self-hosted Postal mail server stack.
#   Path B: Prompting for and validating an existing SMTP mail server.

set -eo pipefail

# Visual styling helper
echo_info() { echo -e "\e[34m[INFO]\e[0m $*"; }
echo_success() { echo -e "\e[32m[✓]\e[0m $*"; }
echo_warning() { echo -e "\e[33m[WARNING]\e[0m $*"; }
echo_error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

echo "===================================================="
echo "          SmartCookie LMS Mail Setup Configurator   "
echo "===================================================="

DOMAIN=""
MAIL_MODE=""
FAST_MODE=false

for arg in "$@"; do
    if [ "$arg" = "--fast" ]; then
        FAST_MODE=true
    elif [ -z "$DOMAIN" ]; then
        DOMAIN="$arg"
    elif [ -z "$MAIL_MODE" ]; then
        MAIL_MODE="$arg"
    fi
done

if [ -z "$DOMAIN" ]; then
    echo_error "No domain name provided."
    echo "Usage: $0 <domain-name> [new|existing] [--fast]"
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

# Locate directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Prompt for MAIL_MODE if not supplied as argument
if [ -z "$MAIL_MODE" ]; then
    echo "Do you already have a mail server to connect to, or should this set up a new self-hosted one (Postal)?"
    echo "  1) Set up a new self-hosted mail server (Postal)"
    echo "  2) Connect to an existing external mail server"
    read -p "Select option [1 or 2, default: 1]: " MAIL_OPTION
    if [ "$MAIL_OPTION" = "2" ]; then
        MAIL_MODE="existing"
    else
        MAIL_MODE="new"
    fi
fi

if [ "$MAIL_MODE" = "existing" ]; then
    if [ "$FAST_MODE" = "false" ]; then
        echo_info "Configuring connection to an existing external mail server..."
    fi
    
    while true; do
        if [ "$FAST_MODE" = "false" ]; then
            echo "===================================================="
            echo "   Existing SMTP Server Credentials Configuration   "
            echo "===================================================="
            echo ""
            echo "💡 WHAT IS AN SMTP HOST?"
            echo "   A mail server address (SMTP Host) is the URL of the service that will send"
            echo "   emails for your SmartCookie LMS (such as verification or password reset emails)."
            echo ""
            echo "   🔍 WHERE TO FIND THIS:"
            echo "   • Self-Hosted Postal: Log in to your Postal admin UI, navigate to:"
            echo "     Organization -> Mail Server -> Credentials."
            echo "   • Commercial Providers: Look in your SendGrid, Mailgun, or AWS SES dashboard"
            echo "     under 'SMTP Settings' or 'API & Integration'."
            echo "   • Personal Accounts:"
            echo "     - Gmail: smtp.gmail.com"
            echo "     - Outlook / Office 365: smtp.office365.com"
            echo "----------------------------------------------------"
        fi
        read -p "Enter SMTP Host: " SMTP_HOST
        while [ -z "$SMTP_HOST" ]; do
            echo_warning "SMTP Host cannot be empty."
            read -p "Enter SMTP Host: " SMTP_HOST
        done

        if [ "$FAST_MODE" = "false" ]; then
            echo ""
            echo "💡 WHAT IS AN SMTP PORT?"
            echo "   A port is a specific gateway channel used to securely transfer email data."
            echo ""
            echo "   📋 WHICH ONE TO CHOOSE?"
            echo "   • 587: Recommended default. Works for almost everyone (secure TLS)."
            echo "   • 465: Used by some providers (SSL encryption)."
            echo "   • 25 : Almost never correct here. Port 25 is for servers talking directly"
            echo "          to each other, not for client authentication like this."
            echo "----------------------------------------------------"
        fi
        read -p "Enter SMTP Port [default: 587]: " SMTP_PORT
        SMTP_PORT=${SMTP_PORT:-"587"}

        if [ "$FAST_MODE" = "false" ]; then
            echo ""
            echo "💡 WHAT IS AN SMTP USERNAME?"
            echo "   This identifies your account/server to the mail server for authentication."
            echo ""
            echo "   📋 COMMON FORMATS:"
            echo "   • This is often your full email address (e.g., mailer@yourdomain.com)."
            echo "   • For some commercial services (like SendGrid), this might be a static"
            echo "     API user ID (e.g., 'apikey')."
            echo "----------------------------------------------------"
        fi
        read -p "Enter SMTP Username: " SMTP_USER
        while [ -z "$SMTP_USER" ]; do
            echo_warning "SMTP Username cannot be empty."
            read -p "Enter SMTP Username: " SMTP_USER
        done

        if [ "$FAST_MODE" = "false" ]; then
            echo ""
            echo "💡 WHAT IS AN SMTP PASSWORD?"
            echo "   The password or secure key required to authenticate with the mail server."
            echo ""
            echo "   ⚠️  CRITICAL SECURITY NOTE:"
            echo "   • Most providers require a generated 'App Password' or 'API Key' here."
            echo "     Do NOT use your normal primary account login password."
            echo "   • For safety, your typing will be hidden as you enter this password."
            echo "----------------------------------------------------"
        fi
        read -s -p "Enter SMTP Password: " SMTP_PASS
        echo ""
        while [ -z "$SMTP_PASS" ]; do
            echo_warning "SMTP Password cannot be empty."
            read -s -p "Enter SMTP Password: " SMTP_PASS
            echo ""
        done

        if [ "$FAST_MODE" = "false" ]; then
            echo ""
            echo "💡 WHAT IS AN SMTP FROM-ADDRESS?"
            echo "   This is the sender email address that recipients will see in their inbox"
            echo "   (e.g., 'no-reply@yourdomain.com')."
            echo ""
            echo "   ⚠️  IMPORTANT AUTHORIZATION RULES:"
            echo "   • This address should match a domain that your mail server is authorized"
            echo "     to send on behalf of. If they don't match, your emails may be rejected"
            echo "     by receivers (like Gmail or Yahoo) or land directly in spam."
            echo "----------------------------------------------------"
        fi
        read -p "Enter SMTP From-Address [default: no-reply@$DOMAIN]: " SMTP_FROM
        SMTP_FROM=${SMTP_FROM:-"no-reply@$DOMAIN"}

        echo_info "Testing SMTP connection and authentication to $SMTP_HOST:$SMTP_PORT..."
        
        # Write temporary ESM node script for SMTP verification
        cat << 'EOF' > "$PROJECT_ROOT/test-smtp.js"
import nodemailer from 'nodemailer';

const host = process.argv[2];
const port = parseInt(process.argv[3], 10);
const user = process.argv[4];
const pass = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user && pass ? { user, pass } : undefined,
  connectionTimeout: 5000,
});

transporter.verify((error, success) => {
  if (error) {
    console.error(error.message);
    process.exit(1);
  } else {
    process.exit(0);
  }
});
EOF

        # Run SMTP validation using node from the project root (where nodemailer is installed)
        cd "$PROJECT_ROOT"
        SMTP_ERR_MSG=$(SMTP_PASS="$SMTP_PASS" node test-smtp.js "$SMTP_HOST" "$SMTP_PORT" "$SMTP_USER" 2>&1 || true)
        rm -f "$PROJECT_ROOT/test-smtp.js"
        
        if [ -z "$SMTP_ERR_MSG" ]; then
            echo_success "SMTP Connection test successful! Credentials verified."
            
            # Write verified credentials directly to .env
            echo_info "Writing credentials to .env..."
            if [ -f ".env" ]; then
                sed -i "s|^SMTP_HOST=.*|SMTP_HOST=\"$SMTP_HOST\"|g" .env
                sed -i "s|^SMTP_PORT=.*|SMTP_PORT=\"$SMTP_PORT\"|g" .env
                sed -i "s|^SMTP_USER=.*|SMTP_USER=\"$SMTP_USER\"|g" .env
                sed -i "s|^SMTP_PASS=.*|SMTP_PASS=\"$SMTP_PASS\"|g" .env
                sed -i "s|^SMTP_FROM=.*|SMTP_FROM=\"$SMTP_FROM\"|g" .env
            else
                echo_error ".env file not found. Ensure STAGE 2 (Database setup) ran first."
                exit 1
            fi
            
            break
        else
            echo_error "SMTP Connection test FAILED!"
            echo "Error details: $SMTP_ERR_MSG"
            echo "----------------------------------------------------"
            read -p "Would you like to try configuring SMTP credentials again? [Y/n]: " TRY_AGAIN
            TRY_AGAIN=${TRY_AGAIN:-"y"}
            if [[ "$TRY_AGAIN" =~ ^[Nn] ]]; then
                echo_error "SMTP verification failed. Aborting installation."
                exit 1
            fi
        fi
    done

    echo "===================================================="
    echo_success "Existing mail server connection verified and saved!"
    echo "===================================================="

else
    # Path A: Set up new (Postal)
    echo_info "Initializing new self-hosted Postal Mail Server stack..."
    
    POSTAL_DOMAIN="postal.$DOMAIN"

    # 1. Clone postalserver/install per Postal's own official installer pattern
    if [ ! -d "/opt/postal/install" ]; then
        echo_info "Cloning Postal installation utility to /opt/postal/install..."
        sudo git clone https://github.com/postalserver/install /opt/postal/install
    else
        echo_info "Postal installation helper already exists at /opt/postal/install."
    fi

    # Link binary
    if [ ! -L "/usr/bin/postal" ]; then
        echo_info "Creating symlink for postal CLI at /usr/bin/postal..."
        sudo ln -s /opt/postal/install/bin/postal /usr/bin/postal
    fi

    # Retrieve existing password if possible (TASK B & TASK C)
    MARIADB_ROOT_PASS=""
    if [ -f "/opt/postal/.mariadb_root_pass" ]; then
        MARIADB_ROOT_PASS=$(sudo cat "/opt/postal/.mariadb_root_pass" | tr -d '"' | tr -d "'" | tr -d '[:space:]')
        echo_info "Successfully retrieved MariaDB root password from /opt/postal/.mariadb_root_pass"
    elif [ -f "/opt/postal/config/postal.yml" ]; then
        MARIADB_ROOT_PASS=$(sudo grep -A 5 "main_db:" "/opt/postal/config/postal.yml" | grep "password:" | head -n1 | awk '{print $2}' | tr -d '"' | tr -d "'" | tr -d '[:space:]' || echo "")
        echo_info "Retrieved MariaDB root password from /opt/postal/config/postal.yml"
    fi

    # 2. Runs Postal's own dedicated MariaDB container with a randomly generated root password
    # Maps to port 3307 to prevent conflicts with host's MariaDB (used for SmartCookie) on port 3306.
    if docker ps -a --format '{{.Names}}' | grep -Eq "^postal-mariadb$"; then
        echo_info "Postal MariaDB container already exists."
        if [ "$(docker ps -q -f name=postal-mariadb)" ]; then
            echo_success "Postal MariaDB container is already active."
        else
            echo_info "Starting existing Postal MariaDB container..."
            sudo docker start postal-mariadb >/dev/null
        fi
        
        # If password is still empty for some reason, generate a new one
        if [ -z "$MARIADB_ROOT_PASS" ]; then
            MARIADB_ROOT_PASS=$(openssl rand -hex 16)
            echo_info "Writing newly generated MariaDB root password to /opt/postal/.mariadb_root_pass..."
            sudo mkdir -p /opt/postal
            echo "$MARIADB_ROOT_PASS" | sudo tee /opt/postal/.mariadb_root_pass >/dev/null
            sudo chmod 600 /opt/postal/.mariadb_root_pass
        fi
    else
        # If password is still empty (neither file nor config existed), generate it now
        if [ -z "$MARIADB_ROOT_PASS" ]; then
            MARIADB_ROOT_PASS=$(openssl rand -hex 16)
        fi
        
        # IMMEDIATELY write the password to /opt/postal/.mariadb_root_pass with chmod 600 (TASK B)
        echo_info "Persisting generated MariaDB root password to /opt/postal/.mariadb_root_pass..."
        sudo mkdir -p /opt/postal
        echo "$MARIADB_ROOT_PASS" | sudo tee /opt/postal/.mariadb_root_pass >/dev/null
        sudo chmod 600 /opt/postal/.mariadb_root_pass
        
        echo_info "Starting dedicated Postal MariaDB container on local port 3307..."
        sudo docker run -d \
           --name postal-mariadb \
           -p 127.0.0.1:3307:3306 \
           --restart always \
           -e MARIADB_DATABASE=postal \
           -e MARIADB_ROOT_PASSWORD="$MARIADB_ROOT_PASS" \
           mariadb >/dev/null
    fi

    # 3. Bootstrap Postal configuration if missing
    POSTAL_CONF="/opt/postal/config/postal.yml"
    if [ ! -f "$POSTAL_CONF" ]; then
        echo_info "Bootstrapping Postal configuration for admin UI domain '$POSTAL_DOMAIN'..."
        sudo postal bootstrap "$POSTAL_DOMAIN"
        
        # Update postal.yml to use localhost port 3307 and set the generated password
        if [ -f "$POSTAL_CONF" ]; then
            echo_info "Patching database settings in $POSTAL_CONF..."
            sudo sed -i 's/port: 3306/port: 3307/g' "$POSTAL_CONF"
            sudo sed -i "s/password: .*/password: \"$MARIADB_ROOT_PASS\"/g" "$POSTAL_CONF"
        fi
    else
        echo_info "Postal configuration already bootstrapped at $POSTAL_CONF."
    fi

    # 4. Run Postal initialization (idempotent, performs DB migrations)
    echo_info "Running Postal database initialization..."
    sudo postal initialize

    # 5. Prompt to create the initial admin user
    echo "----------------------------------------------------"
    echo "Creating the Postal Admin User. Please enter details:"
    echo "----------------------------------------------------"
    # postal make-user is interactive, we call it directly
    if ! sudo postal make-user; then
        echo_warning "Admin user creation prompt was closed or failed."
        echo "You can create users manually later via: sudo postal make-user"
    fi

    # 6. Start the Postal container service stack
    echo_info "Starting Postal application containers..."
    sudo postal start

    echo "===================================================="
    echo_success "Postal Mail Server Setup Completed!"
    echo "===================================================="
    echo "SUMMARY OF RESULTS:"
    echo "  - Admin UI Domain:     http://$POSTAL_DOMAIN"
    echo "  - Admin UI Local Port: 127.0.0.1:5000 (binds internally)"
    echo "  - MariaDB Host Port:   127.0.0.1:3307"
    echo ""
    echo "NEXT STEPS IN WEB UI:"
    echo "  1. Add an Apache proxy for http://$POSTAL_DOMAIN to proxy to http://127.0.0.1:5000"
    echo "  2. Log in with your newly created admin credentials."
    echo "  3. Create an Organization (e.g., 'SmartCookie LMS')."
    echo "  4. Create a Mail Server (e.g., 'smartcookie-relay')."
    echo "  5. Add your domain '$DOMAIN' under the Server."
    echo "  6. Generate your SMTP credentials and DKIM keys inside that server's settings."
    echo "  7. Once the domain has been added to Postal, run '06-generate-dns-guide.sh'"
    echo "     to generate your production DNS records guide!"
    echo "===================================================="
fi
