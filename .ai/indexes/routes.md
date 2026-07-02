# Route Index

This index acts as the central registry of all active visual routers and client-side view tabs.

---

## 🧭 Navigation Route Schema

Every listed visual route should eventually document:
- **Path**: Target URL route segment or local tab key.
- **Component**: The core page view component managing the render.
- **Guards**: Redirect hooks or session validators.
- **Permissions**: Roles allowed to navigate to the view.

---

## 🟢 Client View Routes (v1.0.0)

### 1. `my-lessons`
- **Path**: Local State Tab (`Tab.MyLessons`)
- **Component**: `src/features/lessons/pages/MyLessons.tsx`
- **Guards**: None (Public)
- **Permissions**: Any viewer

### 2. `catalog`
- **Path**: Local State Tab (`Tab.Catalog`)
- **Component**: `src/features/catalog/pages/Catalog.tsx`
- **Guards**: None (Public)
- **Permissions**: Any viewer
