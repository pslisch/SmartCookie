# UI Guidelines

This document outlines the UI principles and aesthetic standards for the **SmartCookie** LMS.

---

## 🎨 Aesthetic Mood: Modern & Friendly Light Theme

SmartCookie utilizes a clean, modern, high-contrast light theme. It emphasizes content focus, readable text layout, and inviting, interactive hover states.

### Core Principles

1. **Light Slate Backgrounds**
   - Main backgrounds use a soft off-white (`bg-slate-50` or `bg-gray-50`) to minimize eye strain.
   - Cards and structural sections use pure white (`bg-white`) bordered by a subtle gray stroke (`border border-slate-100` or `border-gray-200`).

2. **Rounded Corners & Fluid Radii**
   - High rounded-corners (`rounded-xl` and `rounded-2xl`) give the app a friendly, premium, educational feel.

3. **Subtle Elevation**
   - Avoid dark, muddy drop shadows. Use subtle, soft elevations (`shadow-sm`, `shadow-md` on hover) with low-opacity slate colors.

4. **Smooth Transitions**
   - Always add `transition-all duration-200 ease-out` for buttons, cards, list items, and tabs when hovering or shifting focus.

---

## 🅰️ Typography

- **Primary Font**: `Inter` (sans-serif) for general UI, lists, buttons, and form labels.
- **Display Font**: `Inter` with medium-to-bold weights and tight tracking (`tracking-tight`) for high-level dashboard headers and titles.
- **Accents**: Subtle, high-contrast text color combinations (`text-slate-900` paired with supporting description lines in `text-slate-500`).

---

## 📱 Responsive & Touch-Target Design

1. **Tap Targets**
   - Buttons, links, and navigation items must support a minimal touch region of `44x44px` on mobile viewports.

2. **Responsive Shelves**
   - Sidebars/nav drawers should slide out cleanly, and headers must adapt smoothly between wide-screen list views and mobile stacked grids.
