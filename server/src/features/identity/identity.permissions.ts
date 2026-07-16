import { registerPermission } from '../../shared/permissions/registry';

// Register the module "identity-providers" with actions matching the security matrix
registerPermission('identity-providers', 'configure');
registerPermission('identity-providers', 'view-config');
registerPermission('identity-providers', 'view-logs');
registerPermission('identity-providers', 'manual-sync');
