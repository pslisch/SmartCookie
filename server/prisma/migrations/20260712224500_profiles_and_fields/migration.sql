-- AlterTable
ALTER TABLE `users` ADD COLUMN `first_name` VARCHAR(191) NULL,
    ADD COLUMN `last_name` VARCHAR(191) NULL,
    ADD COLUMN `profile_picture_path` VARCHAR(191) NULL,
    ADD COLUMN `last_login_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `tokens` ADD COLUMN `pending_email` VARCHAR(191) NULL,
    MODIFY `purpose` ENUM('INVITATION', 'PASSWORD_RESET', 'EMAIL_CHANGE') NOT NULL;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `mandatory_notification_types` JSON NULL;

-- CreateTable
CREATE TABLE `profile_field_categories` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `display_order` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_field_definitions` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NULL,
    `field_key` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `field_type` ENUM('TEXT', 'MULTILINE', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'CHECKBOX', 'DROPDOWN', 'RADIO') NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `editable_by_user` BOOLEAN NOT NULL DEFAULT true,
    `display_order` INTEGER NOT NULL,
    `default_value` VARCHAR(191) NULL,
    `validation_rules` JSON NULL,
    `options` JSON NULL,
    `is_system_field` BOOLEAN NOT NULL DEFAULT false,
    `external_sync_locked` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `profile_field_definitions_company_id_field_key_key`(`company_id`, `field_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `field_editable_by_roles` (
    `field_definition_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`field_definition_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_field_values` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `field_definition_id` VARCHAR(191) NOT NULL,
    `value` TEXT NULL,

    UNIQUE INDEX `profile_field_values_user_id_field_definition_id_key`(`user_id`, `field_definition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_preferences` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `notification_type` ENUM('LESSON_ASSIGNED', 'REMINDER', 'DUE_SOON', 'OVERDUE', 'COMPLETION_CONFIRMATION', 'CERTIFICATES', 'SYSTEM_ANNOUNCEMENTS') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `notification_preferences_user_id_notification_type_key`(`user_id`, `notification_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile_field_categories` ADD CONSTRAINT `profile_field_categories_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_field_definitions` ADD CONSTRAINT `profile_field_definitions_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_field_definitions` ADD CONSTRAINT `profile_field_definitions_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `profile_field_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_editable_by_roles` ADD CONSTRAINT `field_editable_by_roles_field_definition_id_fkey` FOREIGN KEY (`field_definition_id`) REFERENCES `profile_field_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_editable_by_roles` ADD CONSTRAINT `field_editable_by_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_field_values` ADD CONSTRAINT `profile_field_values_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_field_values` ADD CONSTRAINT `profile_field_values_field_definition_id_fkey` FOREIGN KEY (`field_definition_id`) REFERENCES `profile_field_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
