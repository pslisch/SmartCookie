# SmartCookie LMS - Production Server Installation Tooling

This directory contains the automated, idempotent tooling and documentation necessary to deploy **SmartCookie LMS** on a dedicated Ubuntu VPS behind an Apache reverse proxy.

---

## 🚀 The One-Command Installer (Recommended)

To run the entire installation, run the master orchestrator script. It automates system diagnostics, database provisioning, application dependency compilation, Apache reverse proxy routing, Certbot SSL certificate retrieval, and background service setup:

```bash
sudo ./deploy/install.sh yourdomain.com [your-email@example.com]
```

Once completed, you do not need to configure anything on the command line. Instead, simply navigate to your domain in the web browser, where the interactive **Setup Wizard** will guide you through setting up your root superuser, Multi-Factor Authentication, company profile, and your external SMTP mail configurations (fully validated and securely stored in the database).

---

## 🌟 One-Line Bootstrap, Update & Uninstall Commands

In addition to individual setup scripts, SmartCookie LMS includes high-level orchestration commands to manage the full lifecycle of your deployment.

### 📥 1. True One-Line Bootstrap
For a completely clean, zero-configuration VPS setup, you can initiate the entire installation in one command without manual cloning:

```bash
curl -fsSL https://raw.githubusercontent.com/vrsika/smartcookie/main/deploy/bootstrap.sh | sudo bash -s -- yourdomain.com [your-email@example.com]
```

* **Safeguards:** If `/opt/smartcookie` already exists, this command will immediately halt with a clear error pointing to the update script instead of blindly overwriting any files.
* **Flow:** Clones the repository to `/opt/smartcookie` and directly hands over execution to `deploy/install.sh`.

### 🔄 2. Safe, Idempotent Updates
To pull the latest releases, apply migrations, compile frontend assets, and restart the systemd daemon, run the update script inside `/opt/smartcookie`:

```bash
sudo /opt/smartcookie/deploy/update.sh
```

* **Fast No-Op Check:** Compares your local HEAD against `origin/main` (after a `git fetch`). If there are no new commits, the script exits immediately with `0` in under a second—skipping database backups, migrations, and compiles entirely.
* **Robust DB Backup:** Before running any migrations, a timestamped `.sql` backup is created outside the application folder at `/opt/smartcookie-backups/`. If backup fails, the update aborts.
* **Migration Failure Safety:** If `npx prisma migrate deploy` fails, the script stops immediately to protect the running server, printing the exact recovery path to restore the pre-update backup.
* **Zero-Downtime Builds:** Frontend compilation and backend bundler processes compile into `dist.new/`. The active `dist/` is atomically swapped only after a 100% successful compilation, ensuring the application is never left in a broken or partial state.
* **Auto-Diagnosis Health Check:** Pings `http://localhost:3000/api/health` after restarting. If the app is unhealthy, it alerts you with instructions to check `journalctl -u smartcookie.service` for rapid diagnosis.

### 🗑️ 3. Safe, Final-Backup-First Uninstall
To completely remove the SmartCookie LMS footprint from your server, execute the uninstaller:

```bash
sudo /opt/smartcookie/deploy/uninstall.sh
```

* **Anti-Reflexive Confirmation:** Prompts for the exact domain name or confirmation phrase to be typed back. It also supports non-interactive uninstalls using the `--confirm` flag.
* **Backup First:** Automatically creates a final backup of your SQL database to the invoking user's home directory (e.g. `~/smartcookie-final-backup-<timestamp>.sql` or `/root/`). **If the backup fails, the uninstall process aborts immediately before deleting anything.**
* **Destructive Scope (What is Cleaned):**
  - Stops, disables, and removes the `smartcookie.service` unit.
  - Drops the `smartcookie` database and the application database user.
  - Disables and removes the Apache `smartcookie.conf` site configuration.
  - Deletes `/opt/smartcookie` and all temporary files.
* **Preservation Scope (What is Preserved):**
  - Shared services like MySQL, Apache, Node.js, and firewall (ufw) rules remain completely unaffected.

---

## 🛠️ Step-by-Step Installation Scripts

If you prefer to run each script individually, or need to troubleshoot a specific stage, execute them in the following order:

### 1️⃣ `deploy/00-preflight.sh`
Performs verification checks on your VPS:
* Confirms standard user with `sudo` access is executing the script (prevents raw `root` over-reach).
* Verifies mandatory CLI tools exist.
* Verifies domain DNS A record resolution matches the public IP to ensure Certbot Let's Encrypt certificates resolve successfully.
* **Run command:** `sudo ./deploy/00-preflight.sh yourdomain.com`

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

---

## 🔄 Idempotency & Safe Re-Runs

Every single script is written to be **fully idempotent**. If any script fails or is terminated:
1. Fix the underlying problem (e.g., install a missing dependency).
2. Re-run the script or re-run `sudo ./deploy/install.sh yourdomain.com`.
3. The scripts will detect what is already configured (e.g., existing `.env` credentials, existing Apache configurations, or active database containers) and will safely skip over them without losing data or producing destructive conflicts.
