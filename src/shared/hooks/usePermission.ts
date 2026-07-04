import { useAuth } from '../components/AppGate';

/**
 * Custom hook to check if the current logged-in user has permission for a specific module and action.
 * Returns true if the user is a Superuser (short-circuits to true) or if their effectivePermissions
 * array contains the "module:action" string.
 * This is for UI-visibility and progressive enhancement only — real enforcement always occurs server-side.
 */
export function usePermission(module: string, action: string): boolean {
  const { user } = useAuth();

  if (!user) {
    return false;
  }

  // Superuser always gets access to everything
  if (user.isSuperuser) {
    return true;
  }

  const permissionKey = `${module}:${action}`;
  return user.effectivePermissions?.includes(permissionKey) ?? false;
}
