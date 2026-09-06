import { registerPermission } from '../../shared/permissions/registry';

// Register the module "theme" with the required actions
registerPermission('theme', 'view');
registerPermission('theme', 'edit');
registerPermission('theme', 'delete');
registerPermission('theme', 'set-ready');
registerPermission('theme', 'activate');
