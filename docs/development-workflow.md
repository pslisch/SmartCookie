# Development Workflow

This document explains the step-by-step workflow for designing, building, and deploying updates to the **SmartCookie** LMS.

---

## 🔁 Feature Lifecycle

Every update or feature integration must follow a defined progression:

### Step 1: Definition & Alignment
- Identify the feature scope. Verify alignment against the **SmartCookie Constitution** (`docs/CONSTITUTION.md`).
- Ensure no out-of-scope logic is planned.

### Step 2: Architecture Planning & Updates
- Define files to be added/modified.
- If necessary, update `docs/architecture.md` and outline the schemas or state management.

### Step 3: Incremental Coding
- Implement types first in `src/types/`.
- Code core structural utilities, custom hooks, or background modules.
- Create modular React components under `src/components/` and `src/pages/`.
- Maintain compile readiness after each incremental change.

### Step 4: Verification
- Execute fast lint validations (`npm run lint` or `lint_applet`).
- Build the final production application (`npm run build` or `compile_applet`) to ensure zero errors.

### Step 5: Document Changes
- Update the AI indexes (`.ai/indexes/*`) and the AI Project Map (`.ai/project-map.md`) to reflect the completed state.
