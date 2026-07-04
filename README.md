# SmartCookie

Learning Management System foundation shell with navigation, My Lessons dashboard, and comprehensive documentation system.

Full documentation: see [/docs/README.md](./docs/README.md)

---

## Run Locally

Before running, copy `.env.example` to `.env` and set `DATABASE_URL` (pointing to a running MariaDB instance), `SESSION_SECRET`, and `SMTP_*` values — the application requires a database connection to boot.

To spin up the development server locally, execute:

```bash
npm install
npm run dev
```
