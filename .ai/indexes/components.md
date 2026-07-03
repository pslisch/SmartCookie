# Component Index

This index logs all reusable UI, layout, and presentation components engineered within the SmartCookie repository.

---

## 🧩 Component Schema

Every registered component should include:
- **Location**: Relative path of the file.
- **Purpose**: Short, focused explanation of responsibilities.
- **Props**: Key parameters, interfaces, and expected triggers.
- **Used By**: Parent components or layouts invoking this block.
- **Dependencies**: Icons, libraries, or hooks needed.

---

## 📦 Active Component Registry

### 1. `Shell`
- **Location**: `src/shared/components/layout/Shell.tsx`
- **Purpose**: Global viewport layout skeleton.
- **Props**:
  - `children`: `React.ReactNode` - Content inside the visual body.
- **Used By**: `src/App.tsx`
- **Dependencies**: React

### 2. `Navbar`
- **Location**: `src/shared/components/layout/Navbar.tsx`
- **Purpose**: Dynamic responsive navigation bar.
- **Props**:
  - `currentTab`: `Tab` - Active enum identifier.
  - `onTabChange`: `(tab: Tab) => void` - Selection callback.
  - `appName`: `string` - Programmatically formatted application name.
- **Used By**: `src/App.tsx`
- **Dependencies**: Lucide React, Motion, React

### 3. `Footer`
- **Location**: `src/shared/components/layout/Footer.tsx`
- **Purpose**: Bottom structural footer displaying version tags and dynamic copyright hover states.
- **Props**: None (Self-contained).
- **Used By**: `src/App.tsx`
- **Dependencies**: React, Motion, `package.json` metadata

### 4. `LanguageSwitcher`
- **Location**: `src/shared/components/layout/LanguageSwitcher.tsx`
- **Purpose**: Keyboard-accessible language selection drop-down with click-outside and escape-key dismissal.
- **Props**: None (Self-contained).
- **Used By**: `src/shared/components/layout/Navbar.tsx`
- **Dependencies**: React, Lucide React, `react-i18next`

### 5. `AppGate`
- **Location**: `src/shared/components/AppGate.tsx`
- **Purpose**: Main orchestrator and security state machine for app entry. Intercepts views, verifies setup status, validates sessions, and renders either setup wizard, login page, or primary workspace children.
- **Props**:
  - `children`: `React.ReactNode` - Child layouts authorized to render after login.
- **Used By**: `src/App.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, `SetupWizard`, `Login`, Lucide Icons

### 6. `SetupWizard`
- **Location**: `src/features/auth/pages/SetupWizard.tsx`
- **Purpose**: A localized, multi-step layout directing system administrators to register a primary superuser account and root company entity.
- **Props**:
  - `step`: `'superuser' | 'company'` - Active step matching database setup status.
  - `onSuperuserSubmit`: `(username, password, recoveryEmail) => Promise<void>` - Superuser creation trigger.
  - `onCompanySubmit`: `(name, contactInfo) => Promise<void>` - Company registration trigger.
- **Used By**: `src/shared/components/AppGate.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, Lucide Icons

### 7. `Login`
- **Location**: `src/features/auth/pages/Login.tsx`
- **Purpose**: Secure administrator and user credentials form. Integrates with attempted-page storage for automatic redirect-back behavior.
- **Props**:
  - `onLoginSuccess`: `() => Promise<void>` - Refresh trigger on session creation.
- **Used By**: `src/shared/components/AppGate.tsx`
- **Dependencies**: React, `react-i18next`, `motion/react`, Lucide Icons
