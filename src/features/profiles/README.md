# Profiles Feature

This feature handles user profile viewing, custom profile fields, notification preferences, security settings, and achievements (certificates/badges).

## Structure
- `pages/FullProfile.tsx`: The main profile page shell with tabs for Personal Information, Security, Notifications, Account Information, Certificates, and Badges.
- `services/`: Core backend services for profile definitions and value updates.
- `routes/`: Express endpoints for profile fetching and editing.

## Dependencies
- React
- i18next
- lucide-react
- motion/react (for animations and tab layout indicators)
