import { registerPermission } from '../../shared/permissions/registry';

// Register the notification module permissions
registerPermission('notifications', 'view-delivery-failures');
registerPermission('notifications', 'manage-rules');
registerPermission('notifications', 'manage-scheduled');
registerPermission('notifications', 'manage-templates');
