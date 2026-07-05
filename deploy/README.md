# SmartCookie LMS - Production Server Installation Tooling

This directory contains the automated, idempotent tooling and documentation necessary to deploy **SmartCookie LMS** on a dedicated Ubuntu VPS behind an Apache reverse proxy, with support for either a fully isolated self-hosted **Postal Mail Server** container stack or connecting to an **existing SMTP mail server**.

---

## 🚀 The One-Command Installer (Recommended)

To run the entire installation, run the master orchestrator script. It prompts you up-front to choose between installing a new self-hosted mail server (Postal) or connecting to an existing SMTP server:

```bash
sudo ./deploy/install.sh yourdomain.com
```

### 🛣️ Dual Setup Branches

#### Path A: Set up new self-hosted mail server (Postal)
* **Pre-flight Check:** Automatically verifies your VPS provider does not block outbound port 25.
* **Service Setup:** Installs, bootstraps, and starts the containerized Postal mail server.
* **DNS Guide:** Generates a tailored `deploy/DNS_SETUP.md` with base64-encoded DKIM, SPF, and DMARC records.
* **Manual Checkpoint:** Pauses for DNS propagation and to let you retrieve the newly generated Postal SMTP credentials before wiring them.

#### Path B: Connect existing external mail server
* **Pre-flight Check:** Skips Port 25 outbound test and Docker checks entirely (meaningfully faster, no external dependencies).
* **Live Validation:** Prompts for your SMTP credentials and runs a real SMTP connection test (session handshake and auth) to fail loudly on typos or firewalls.
* **Zero Delay:** Directly writes verified settings to `.env` and restarts the systemd service. Reaches a fully working instance in one uninterrupted pass!

---

## 🛠️ Step-by-Step Installation Scripts

If you prefer to run each script individually, or need to troubleshoot a specific stage, execute them in the following order:

### 1️⃣ `deploy/00-preflight.sh`
Performs verification checks on your VPS:
* Confirms standard user with `sudo` access is executing the script (prevents raw `root` over-reach).
* Verifies mandatory CLI tools exist (omits `docker` requirement if on `existing` mail server path).
* **Outbound Port 25 Check:** If deploying a new mail server, attempts to connect to Google SMTP on port 25 to check for VPS provider port blocks. Bypassed entirely for existing mail clients.
* Verifies domain DNS A record resolution.
* **Run command:** `sudo ./deploy/00-preflight.sh yourdomain.com [new|existing]`

### 2️⃣ `deploy/01-setup-database.sh`
Configures the host MySQL/MariaDB database:
* Connects via root UNIX socket authentication (highly secure, passwordless local administrative access).
* Creates database `smartcookie` and user `smartcookie` with a unique, cryptographically secure password (using `openssl`).
* Sets up a secure `.env` file with restrictive file permissions (`600`).
* **Idempotency:** If `.env` already has a configured `DATABASE_URL`, this script automatically skips user creation/modification to protect active data.
* **Run command:** `sudo ./deploy/01-setup-database.sh`

### 3️⃣ `deploy/02-install-app.sh`
Performs package installation and compilation:
* Installs all NPM dependencies.
* Generates Prisma Client.
* Performs database migrations in production mode (`npx prisma migrate deploy`).
* Compiles Vite production static assets and bundles the backend server using esbuild (`dist/server.cjs`).
* **Run command:** `sudo ./deploy/02-install-app.sh`

### 4️⃣ `deploy/03-setup-apache.sh`
Assembles the Apache reverse proxy:
* Enables necessary Apache modules (`proxy`, `proxy_http`, `ssl`, `headers`).
* Generates VirtualHost configuration from `deploy/templates/smartcookie.conf`.
* Automatically configures UFW rules (`Apache Full`).
* Uses Certbot's Apache plugin to obtain a free Let's Encrypt certificate and enforces SSL redirection.
* **Run command:** `sudo ./deploy/03-setup-apache.sh yourdomain.com`

### 5️⃣ `deploy/04-setup-service.sh`
Integrates the systemd system service:
* Compiles `deploy/templates/smartcookie.service` by injecting absolute directories, standard non-root user details, and the local `node` path.
* Installs the unit to `/etc/systemd/system/smartcookie.service`.
* Configures autostart on system boot and automatic restart on crash/failure.
* **Run command:** `sudo ./deploy/04-setup-service.sh`

### 6️⃣ `deploy/05-setup-mail.sh`
Configures SMTP credentials or installs self-hosted mail:
* **new (Postal):** Clones Postal installer, boots MariaDB Docker on port 3307, bootstraps and initializes Postal config, starts Postal services.
* **existing:** Interactively prompts for Host, Port, Username, Password, and From-Address, runs live nodemailer connection check, and writes verified settings directly to `.env`.
* **Run command:** `sudo ./deploy/05-setup-mail.sh yourdomain.com [new|existing]`

### 7️⃣ `deploy/06-generate-dns-guide.sh`
Generates a custom registrar guide (only applicable for new self-hosted Postal setups):
* Connects to the Postal database and extracts the domain's real private DKIM key.
* Dynamically derives the matching public RSA key for registrar TXT records.
* Writes a comprehensive DNS records guide to `deploy/DNS_SETUP.md`.
* **Run command:** `sudo ./deploy/06-generate-dns-guide.sh yourdomain.com`

---

## 🔄 Idempotency & Safe Re-Runs

Every single script is written to be **fully idempotent**. If any script fails or is terminated:
1. Fix the underlying problem (e.g., install a missing dependency or request VPS provider to open port 25).
2. Re-run the script or re-run `sudo ./deploy/install.sh yourdomain.com`.
3. The scripts will detect what is already configured (e.g., existing `.env` credentials, existing Apache configurations, or active database containers) and will safely skip over them without losing data or producing destructive conflicts.
