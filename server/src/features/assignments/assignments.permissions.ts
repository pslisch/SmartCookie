import { registerPermission } from '../../shared/permissions/registry';

// Register the module "assignments" with the required actions
registerPermission('assignments', 'view');
registerPermission('assignments', 'create');
registerPermission('assignments', 'edit');
registerPermission('assignments', 'delete');
registerPermission('assignments', 'assign-own-groups');
registerPermission('assignments', 'assign-globally');
registerPermission('assignments', 'view-reports');
registerPermission('assignments', 'create-mandatory');
