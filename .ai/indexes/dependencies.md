# Dependency Index

This index catalogues dependencies mapped between visual pages, functional modules, and internal resources.

---

## 🔗 Dependency Map Schema

Each feature should eventually map:
- **Uses**: Internal components or helpers imported by this feature.
- **Used By**: Pages or blocks invoking this feature.
- **Database**: Schemas or tables utilized.
- **Services**: Services called.
- **Components**: Components rendered inside.
- **Routes**: Navigation pathways targeting this component.
- **Events**: Events dispatched.

---

## 🟢 Module Dependencies (v1.0.0)

### 1. Visual Navigation Bar
- **Uses**: `src/shared/types/index.ts`
- **Used By**: `src/App.tsx`
- **Database**: None
- **Services**: None
- **Components**: None (Self-contained)
- **Routes**: `my-lessons`, `catalog`
- **Events**: None

### 2. MyLessons Student Hub
- **Uses**: React, Motion, Lucide icons, `src/shared/types/index.ts`
- **Used By**: `src/App.tsx`
- **Database**: None
- **Services**: None
- **Components**: None (Stat cards are inline placeholders)
- **Routes**: `my-lessons`
- **Events**: None

### 3. Curriculum Catalog
- **Uses**: React, Motion, Lucide icons
- **Used By**: `src/App.tsx`
- **Database**: None
- **Services**: None
- **Components**: None (Catalog stream cards are inline placeholders)
- **Routes**: `catalog`
- **Events**: None

---

## 🟡 Unused / Reserved Dependencies
- **Packages**: `@google/genai`, `express`, `dotenv` (Platform-injected defaults, currently unused in the v1.0.0 client-only build. See [ADR-0002](../decisions/README.md#adr-0002-document-unused-platform-dependencies)).
