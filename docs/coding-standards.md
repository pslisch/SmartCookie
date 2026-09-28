# Coding Standards

This document establishes the coding conventions and standards for the **SmartCookie** LMS.

---

## 💻 TypeScript Guidelines

1. **Strict Typing**
   - Avoid `any`. Use precise, descriptive types or generic contracts.
   - All function parameters and return types should be declared.

2. **Module Imports**
   - Import statements must be placed at the top level of files.
   - Use named imports instead of object destructuring where possible.
   - Do **NOT** use `import type` to import enum values; use normal imports.

3. **Enums**
   - Use standard `enum` declarations instead of `const enum`.
   ```typescript
   export enum Tab {
     MyLessons = 'my-lessons',
     Catalog = 'catalog'
   }
   ```

---

## ⚛️ React Best Practices

1. **Component Declarations**
   - Always use functional components and hooks.
   - Keep components small and focused. Extract sub-elements when they exceed ~150 lines.

2. **React Hooks & Re-renders**
   - Avoid infinite re-renders. Never update state directly in a component body.
   - Keep dependency arrays primitive. Avoid including full objects or arrays in `useEffect` or `useMemo` unless they are stabilized outside or heavily memoized.

3. **Dynamic Lists**
   - When mapping items to lists, always specify a unique, stable `key` property (prefer database IDs, avoid array indices if items can change positions).

---

## 🎨 Styling with Tailwind CSS

1. **Tailwind-Only**
   - Write styles using Tailwind CSS utility classes exclusively.
   - Do not use custom inline `style={...}` tags or separate `.css` modules.

2. **Class Order & Readability**
   - Group styles logically: Layout/Display (`flex block relative`), Sizing/Spacing (`w-full px-4 py-2`), Typography (`text-sm font-semibold`), Visuals (`bg-card-bg rounded-lg shadow-sm`), Interactions/Transitions (`hover:bg-bg-subtle transition-colors`).

---

## 🔒 Security & Data Integrity Standards

1. **Audit Logging & Secret Redaction**
   - All state-altering administrative, authorization, and assignment operations must be recorded via `auditLogService.log()`.
   - Never log raw secrets, credentials, or tokens.
   - All payload details and changes arrays must pass through `sanitizeAuditPayload()` and `sanitizeAuditChanges()`.
   - For user-facing display names in audit logs, always format using `getUserDisplayName(user)`.

2. **Transactional Communications**
   - Always dispatch emails through `emailService.send()` or enqueue background deliveries via `notificationDelivery`.
   - Never write direct unhandled SMTP socket invocations in business logic.

