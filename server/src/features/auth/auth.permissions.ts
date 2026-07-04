import { registerPermission } from '../../shared/permissions/registry';

// Register the module "users" with the complete set of standard actions as requested
registerPermission('users', 'view');
registerPermission('users', 'create');
registerPermission('users', 'edit');
registerPermission('users', 'delete');
registerPermission('users', 'import');
registerPermission('users', 'export');
