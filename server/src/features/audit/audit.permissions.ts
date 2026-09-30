import { registerPermission } from '../../shared/permissions/registry';

// Register the audit module permissions
registerPermission('audit', 'view');
registerPermission('audit', 'manage-retention');
registerPermission('audit', 'receive-failure-alerts');
