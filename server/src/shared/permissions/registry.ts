export interface RegisteredPermission {
  module: string;
  action: string;
}

const registeredPermissions: RegisteredPermission[] = [];

/**
 * Registers a permission block in memory for synchronization during boot.
 */
export function registerPermission(module: string, action: string) {
  const exists = registeredPermissions.some(
    (p) => p.module === module && p.action === action
  );
  if (!exists) {
    registeredPermissions.push({ module, action });
  }
}

/**
 * Retrieves all registered permissions.
 */
export function getRegisteredPermissions(): RegisteredPermission[] {
  return [...registeredPermissions];
}
