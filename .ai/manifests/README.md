# Manifests Registry

This folder holds feature specification manifests (YAML format) that detail the components, pages, APIs, tables, events, and testing files used by each standalone feature.

Every single feature of SmartCookie will eventually receive one central manifest file here.

---

## 🔮 Future Manifest Registry

- **`authentication.yaml`**: Coordinates login pathways, user profile schemas, and route guards.
- **`courses.yaml`**: Maps slides, chapters, and enrollment trackers.
- **`catalog.yaml`**: Mappings for course marketplaces, filtering logic, and rating triggers.
- **`users.yaml`**: Student databases, streak tracking, and active roles.

---

## 📋 Manifest Structure Reference

```yaml
feature: Authentication
version: 1.0.0
components:
  - src/components/ui/LoginForm.tsx
pages:
  - src/pages/Login.tsx
apis:
  - /api/auth/login
  - /api/auth/register
database_tables:
  - users
routes:
  - /login
permissions:
  - Guest
  - Student
events:
  - auth:state-changed
dependencies:
  - @google/genai
  - firebase-admin
tests:
  - src/tests/auth.test.ts
```
