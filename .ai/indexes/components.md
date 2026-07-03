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
