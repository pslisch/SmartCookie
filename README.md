# SmartCookie

A modern, modular Learning Management System (LMS) with enterprise-
ready authentication, role-based access control, and organizational
structure management.

Full architecture and developer documentation: see [/docs/README.md](./docs/README.md)

---

## Features

- **Internationalization (i18n)** - scaffolded translation infrastructure
- **Authentication** - Superuser setup, guided Setup Wizard, session-based
  login, invitation-based user creation, self-service and admin password
  reset
- **Role-Based Access Control (RBAC)** - custom roles, module/action
  permissions, optional role inheritance, protected Superuser role
- **Organization Model** - unlimited-depth Organization Units with
  soft-delete/restore, Learning Groups (permanent or temporary, with
  expiration reminders), full membership management UI

---

## Tech Stack

**Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, i18next

**Backend:** Node.js, Express, TypeScript, MariaDB, Prisma ORM, Argon2,
Nodemailer

---

## Production Installation

SmartCookie installs on a fresh Ubuntu server (with Apache, Node.js,
and MariaDB already installed) via a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/pslisch/SmartCookie/main/deploy/bootstrap.sh | sudo bash -s -- yourdomain.com [your@email.com]
```

This clones the repository, sets up the database, builds the
application, configures Apache with a Let's Encrypt SSL certificate,
and starts SmartCookie as a systemd service. Once complete, open your
domain in a browser to continue setup through the Setup Wizard
(Superuser account, company details, role templates, and basic
organization structure).

Updating an existing installation to the latest version:

```bash
sudo /opt/smartcookie/deploy/update.sh
```

Removing an installation (preserves Apache, MariaDB, Node.js, Docker,
and any separately-configured mail server - only removes SmartCookie's
own footprint, and takes a final database backup before doing so):

```bash
sudo /opt/smartcookie/deploy/uninstall.sh
```

Full details on each deployment script: see [/deploy/README.md](./deploy/README.md)

---

## Local Development

Before running, copy `.env.example` to `.env` and set `DATABASE_URL`
(pointing to a running MariaDB instance), `SESSION_SECRET`, and
`SMTP_*` values - the application requires a database connection to
boot.

```bash
npm install
npm run dev
```
