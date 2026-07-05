import { registerPermission } from '../../shared/permissions/registry';

// Register the module "organization" with the required actions
registerPermission('organization', 'view');
registerPermission('organization', 'create');
registerPermission('organization', 'edit');
registerPermission('organization', 'delete');
registerPermission('organization', 'manage-members');
registerPermission('organization', 'manage-groups');
