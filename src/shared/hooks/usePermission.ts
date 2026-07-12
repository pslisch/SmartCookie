import { useContext } from 'react';
import { useAuth } from '../components/AppGate';
import { PreviewContext } from '../contexts/PreviewContext';

/**
 * Custom hook to check if the current logged-in user has permission for a specific module and action.
 * Returns true if the user is a Superuser (short-circuits to true) or if their effectivePermissions
 * array contains the "module:action" string.
 * Supports active preview role (suspending isSuperuser bypass for UI-visibility purposes).
 * This is for UI-visibility and progressive enhancement only — real enforcement always occurs server-side.
 */
export function usePermission(module: string, action: string): boolean {
  const { user } = useAuth();
  const preview = useContext(PreviewContext);

  if (!user) {
    return false;
  }

  const permissionKey = `${module}:${action}`;

  // If a preview is active, check the preview's effective permissions and suspend isSuperuser bypass
  if (preview && preview.previewRoleId !== null) {
    return preview.previewEffectivePermissions?.includes(permissionKey) ?? false;
  }

  // Superuser always gets access to everything when no preview is active
  if (user.isSuperuser) {
    return true;
  }

  return user.effectivePermissions?.includes(permissionKey) ?? false;
}
