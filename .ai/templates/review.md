# Review Template: [PR / Feature Review]

This template governs structural quality reviews of newly written code modules prior to completion.

---

## 🔎 Review Overview

- **Reviewer**: AI Coding Agent / [Developer Name]
- **Target Files**: [List files reviewed]
- **Compliance Goal**: Verification against the **SmartCookie Constitution** (`docs/CONSTITUTION.md`).

## 📋 Verification Checklist

- [ ] **Type Safety**: No instances of `any`. Explicit typing verified.
- [ ] **State Side-Effects**: React dependency arrays checked for infinite render loops.
- [ ] **Styling Rules**: Strict Tailwind CSS utility styling (no inline blocks or custom CSS classes).
- [ ] **Metadata Alignment**: Associated AI metadata files (`.ai/*`) updated.
- [ ] **Build Validation**: The code builds green without warning lines.
