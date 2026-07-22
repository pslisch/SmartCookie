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

DOMAIN=""
FAST_MODE=false
for arg in "$@"; do
    if [ "$arg" = "--fast" ] || [ "$arg" = "true" ]; then
        FAST_MODE=true
    elif [ -z "$DOMAIN" ]; then
        DOMAIN="$arg"
    fi
done

if [ -z "$DOMAIN" ]; then
    echo_error "No domain name provided."
    echo "Usage: $0 <domain-name> [--fast]"
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

# 1b. Check system memory and configure swap if needed
# Clean up any existing low-memory flag
rm -f /tmp/sc_low_mem

echo_info "Checking system memory..."
if [ -f /proc/meminfo ]; then
    MEM_KB=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
    SWAP_KB=$(awk '/SwapTotal/ {print $2}' /proc/meminfo)
    MEM_MB=$((MEM_KB / 1024))
    SWAP_MB=$((SWAP_KB / 1024))
    TOTAL_COMBINED_MB=$((MEM_MB + SWAP_MB))
    
    echo_info "System RAM: ${MEM_MB}MB, Active Swap: ${SWAP_MB}MB (Total: ${TOTAL_COMBINED_MB}MB)"
    
    # Threshold check: 4GB is 4096MB. Let's use 4000MB as a safe threshold
    if [ "$TOTAL_COMBINED_MB" -lt 4000 ]; then
        echo_warning "Low memory condition detected!"
        touch /tmp/sc_low_mem
        
        # Check if we should offer/create swap
        SWAP_FILE="/swapfile"
        if grep -q "$SWAP_FILE" /proc/swaps 2>/dev/null; then
            echo_success "A swap file is already active at $SWAP_FILE."
        else
            CREATE_SWAP=false
            if [ "$FAST_MODE" = "true" ]; then
                echo_info "Automatically opting to create swap because --fast mode is enabled."
                CREATE_SWAP=true
            else
                echo ""
                echo "----------------------------------------------------"
                echo_warning "Memory Warning: Your server has less than 4GB of combined RAM + Swap."
                echo "Compiling Node.js native dependencies (such as 'argon2') is highly memory"
                echo "intensive and can cause the system to freeze or kill the process (OOM)."
                echo "We highly recommend setting up a 2GB swap file to ensure stable compilation."
                echo "----------------------------------------------------"
                read -rp "Would you like to automatically create and enable a 2GB swap file? [Y/n]: " response < /dev/tty
                response=${response,,}
                if [[ "$response" =~ ^(yes|y|)$ ]]; then
                    CREATE_SWAP=true
                else
                    echo_warning "User declined swap creation. Build may fail if memory is exhausted."
                fi
            fi
            
            if [ "$CREATE_SWAP" = "true" ]; then
                if [ -f "$SWAP_FILE" ]; then
                    echo_info "Found existing file at $SWAP_FILE. Enabling it as swap..."
                    sudo chmod 600 "$SWAP_FILE"
                    sudo mkswap "$SWAP_FILE"
                    sudo swapon "$SWAP_FILE"
                    echo_success "Swap file enabled."
                else
                    echo_info "Creating a 2GB swap file at $SWAP_FILE..."
                    if ! sudo fallocate -l 2G "$SWAP_FILE" 2>/dev/null; then
                        echo_warning "fallocate failed, falling back to dd..."
                        sudo dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048 status=progress
                    fi
                    sudo chmod 600 "$SWAP_FILE"
                    sudo mkswap "$SWAP_FILE"
                    sudo swapon "$SWAP_FILE"
                    echo_success "2GB Swap file successfully created and enabled."
                fi
                
                # Persist in fstab
                if ! grep -q "$SWAP_FILE" /etc/fstab 2>/dev/null; then
                    echo_info "Persisting swap configuration in /etc/fstab..."
                    echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
                fi
            fi
        fi
    else
        echo_success "Memory check passed: Sufficient memory available (${TOTAL_COMBINED_MB}MB)."
    fi
else
    echo_warning "Unable to access /proc/meminfo. Skipping memory/swap checks."
fi

# 2. Confirm required commands exist
REQUIRED_CMDS=(node npm mysql apache2ctl certbot git ufw)
MISSING_CMDS=()

for cmd in "${REQUIRED_CMDS[@]}"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING_CMDS+=("$cmd")
    fi
done

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
    echo "----------------------------------------------------"
    exit 1
fi
echo_success "All required command-line tools are installed."

# 3. Confirm the provided domain's DNS A record actually resolves to this server's public IP
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

# 4. Detect and select a free port for the application
echo_info "Detecting application port configuration..."

is_port_in_use() {
    local port="$1"
    if command -v ss >/dev/null 2>&1; then
        ss -tln | awk '{print $4}' | grep -qE "[:.]$port$"
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tln | awk '{print $4}' | grep -qE "[:.]$port$"
    else
        (echo > "/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1
    fi
}

is_port_held_by_smartcookie() {
    local port="$1"
    if ! is_port_in_use "$port"; then
        return 1
    fi
    if systemctl is-active --quiet smartcookie.service 2>/dev/null; then
        local service_pid
        service_pid=$(systemctl show -p MainPID --value smartcookie.service 2>/dev/null || echo "")
        if [ -n "$service_pid" ] && [ "$service_pid" -gt 0 ] 2>/dev/null; then
            if command -v ss >/dev/null 2>&1; then
                local pids
                pids=$(sudo ss -tlnp "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
                for pid in $pids; do
                    if [ "$pid" = "$service_pid" ]; then
                        return 0
                    fi
                done
            fi
        fi
    fi
    if command -v ss >/dev/null 2>&1; then
        local proc_info
        proc_info=$(sudo ss -tlnp "sport = :$port" 2>/dev/null || echo "")
        if [[ "$proc_info" == *"server.cjs"* ]] || [[ "$proc_info" == *"smartcookie"* ]]; then
            return 0
        fi
    fi
    return 1
}

# Ensure .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo_info "Creating .env from .env.example..."
        cp .env.example .env
        chmod 600 .env
    else
        touch .env
        chmod 600 .env
    fi
fi

EXISTING_PORT=""
if grep -q "^PORT=" .env 2>/dev/null; then
    EXISTING_PORT=$(grep "^PORT=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || echo "")
fi

SELECTED_PORT=""

if [ -n "$EXISTING_PORT" ] && [[ "$EXISTING_PORT" =~ ^[0-9]+$ ]]; then
    if ! is_port_in_use "$EXISTING_PORT"; then
        SELECTED_PORT="$EXISTING_PORT"
        echo_info "Configured PORT $SELECTED_PORT in .env is free. Reusing it."
    elif is_port_held_by_smartcookie "$EXISTING_PORT"; then
        SELECTED_PORT="$EXISTING_PORT"
        echo_info "Configured PORT $SELECTED_PORT in .env is held by SmartCookie's active instance. Reusing it."
    else
        echo_warning "Configured PORT $EXISTING_PORT in .env is currently in use by another process."
    fi
fi

if [ -z "$SELECTED_PORT" ]; then
    echo_info "Scanning port range 3000-3100 for an available free port..."
    for p in $(seq 3000 3100); do
        if ! is_port_in_use "$p"; then
            SELECTED_PORT="$p"
            break
        fi
    done

    if [ -z "$SELECTED_PORT" ]; then
        echo_error "No free port found in range 3000-3100!"
        exit 1
    fi

    if [ "$SELECTED_PORT" -ne 3000 ]; then
        echo_warning "Default port 3000 is unavailable or in use by another application."
        echo_success "Automatically selected free port: $SELECTED_PORT"
    else
        echo_success "Default port 3000 is free and selected."
    fi
fi

# Write or update PORT in .env
if grep -q "^PORT=" .env; then
    sed -i "s|^PORT=.*|PORT=$SELECTED_PORT|g" .env
else
    echo "PORT=$SELECTED_PORT" >> .env
fi

echo_success "SmartCookie application port resolved to: $SELECTED_PORT (saved in .env)"

echo "===================================================="
echo_success "Pre-flight checks passed! Ready to proceed."
echo "===================================================="
