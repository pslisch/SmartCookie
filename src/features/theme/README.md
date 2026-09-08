# Theme & Branding (Client)

This directory contains the client-side user interface and logic for the **Theme & Branding** system in SmartCookie.

## Structure

- **`pages/ThemeManagement.tsx`**: Main administration dashboard for tenant themes.
  - Lists company themes categorized by status (`ACTIVE`, `SCHEDULED`, `READY`, `DRAFT`).
  - Provides actions: Create from template, Edit, Test theme in session, Activate immediately, Schedule activation, Cancel schedule, Dismiss failure alerts, and Delete theme.
  - Integrates with `ThemeRuntimeContext` to reflect test mode and active theme state.
- **`pages/ThemeEditor.tsx`**: Visual theme customizer with full concurrency lock protection.
  - Multi-tab navigation: **General** (name, branding logo upload/preview/removal, base font size), **Colors** (28 semantic color tokens), and **Fonts** (8 typography slot bindings).
  - Concurrency Lock: Periodically heartbeats `POST /api/themes/:id/lock` every 15 seconds; presents collision warning if held by another user.
  - Dual Display Sub-mode: Switch between Light and Dark mode editing with separate draft states and autosaving.
  - Reset Actions: Per-token and per-font reset to Smart Cookie Default values.
- **`components/LivePreviewPane.tsx`**: Interactive real-time split-screen simulator.
  - Mirrors the complete LMS shell (header, navigation tabs, cards, typography, forms, primary/secondary buttons, status indicators).
  - Updates dynamically as the administrator tweaks branding logo, color tokens, typography slots, base font size, or light/dark mode.
- **`components/ColorEditorTab.tsx`**: Full 28-token semantic color palette manager.
  - Grouped into 8 categories (Navigation, Text, Buttons, Forms, Cards, Links, Status, Backgrounds).
  - Features quick token search/filtering, inline color picker with hex and alpha inputs, and reset to canonical defaults.
- **`components/FontEditorTab.tsx`**: Typography slot binding manager for 8 UI domains.
  - Assigns custom uploaded fonts or the system Inter font to `general`, `nav`, `headings`, `buttons`, `forms`, `cards`, `links`, and `status`.
  - Displays specimen samples and opens the `FontLibrary` modal.
- **`components/FontLibrary.tsx`**: Custom font repository modal dialog.
  - Supports drag-and-drop file uploads for WOFF, WOFF2, TTF, and OTF font files (up to 15MB).
  - Renders font metadata extracted by the backend (family name, weight, style, format, file size).
  - Enforces deletion checks via `FontReplacementModal` if the font is currently bound to any themes.
- **`components/FontReplacementModal.tsx`**: Safeguard modal displayed when attempting to delete an in-use font, prompting the user to select an alternative font to migrate referencing themes.
- **`components/ActivateScheduleModal.tsx`**: Modal allowing immediate activation or scheduling future activations with a datetime picker and timezone hint.
- **`components/ThemeTestBanner.tsx`**: Sticky alert bar across the top of the viewport when testing a theme in ephemeral session mode, with an instant "Exit Test Mode" action.
- **`constants/themeTokens.ts`**: Static dictionary and helper utilities defining the 28 semantic color tokens, descriptions, groupings, and canonical default hex values.
- **`types.ts`**: TypeScript definitions for client-side theme structures, font slots, editor tabs, and lock status.

## Features

- **Semantic Tailwind v4 Tokens**: Components consume design tokens (`bg-card-bg`, `text-text-heading`, `border-card-border`, `bg-btn-primary-bg`, etc.) rather than hardcoded palette classes.
- **Dynamic CSS Variable Injection**: `ThemeRuntimeContext` (`src/shared/contexts/ThemeRuntimeContext.tsx`) coordinates root-level CSS custom property updates without per-component re-renders.
- **Font-Face Generation**: Dynamically constructs and injects `@font-face` rules with fallback typography stacks for uploaded fonts.
- **Ephemeral Session Test Mode**: Lets administrators safely preview themes across all platform routes without affecting any other active users.
- **Client-Side Light / Dark Mode Toggle**: Toggles active token sets between light and dark variants instantly with fallback to OS preference and persistence in `localStorage`.
