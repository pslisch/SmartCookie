# Authentication & System Setup Wizard

This directory contains the client-side user interface and logic for the System Setup Wizard and Security Authentication flows.

## Structure

- **`pages/SetupWizard.tsx`**: Multi-step workspace initialization wizard:
  - **Step 1: Superuser Creation**: Configures the root system administrator profile.
  - **Step 2: Company Setup**: Provisions the primary root system identity.
  - Fully dynamic step inference driven by the database state via `/api/setup/status`.
- **`pages/AcceptInvitation.tsx`**: One-time activation portal for invited members. Enforces strong password criteria and automatically signs the activated user in.
- **`pages/ForgotPassword.tsx`**: Safe, enumeration-free recovery trigger. Guarantees timing-insensitive processing and uniform messaging regardless of identifier status.
- **`pages/ResetPassword.tsx`**: Consumes recovery tokens, checks security rules, invalidates all active sessions across other devices on completion, and initiates immediate session setup.
- **`AppGate.tsx`**: Orchestrator and state machine of application entry. Blocks unauthorized API access, requires valid cookies, prevents session leaks, handles URL-based invitation/activation routes, and verifies the setup is complete before rendering children layouts.

## Features

- **Double-Submit CSRF Protection**: Fully wired to state-changing operations on both standard and recovery paths.
- **Fixed-Attempt Rate Limiting**: Mitigates brute-force attacks against system credentials, with separate, secure rate limits for forgot password triggers.
- **Timing-Attack & Enumeration Defense**: Protects user privacy through generic messages, background processing, and uniform response times.
- **Central Session Invalidation**: Resets all active session tokens on password change to force multi-device sign-outs.
- **i18n Translation Binding**: 100% of the text, labels, and success/error states are safely wrapped in structured translation keys.
- **Tailwind CSS & Motion Animations**: Seamless transitions between wizard, login, recovery, and reset states with elegant responsive layouts.
