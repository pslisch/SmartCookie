import { registerPermission } from '../../shared/permissions/registry';

// Register the module "profile-fields"
registerPermission('profile-fields', 'manage-categories');
registerPermission('profile-fields', 'manage-fields');
