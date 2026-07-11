import { registerPermission } from '../../shared/permissions/registry.js';

// Register the module "content" with the required actions
registerPermission('content', 'import');
registerPermission('content', 'edit');
registerPermission('content', 'delete');
registerPermission('content', 'publish');
registerPermission('content', 'view');
registerPermission('content', 'manage-categories');
