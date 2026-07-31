/*
  Warnings:

  - A unique constraint covering the columns `[company_id,entra_group_id]` on the table `organization_units` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,entra_object_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `memberships` DROP FOREIGN KEY `memberships_learning_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `memberships` DROP FOREIGN KEY `memberships_organization_unit_id_fkey`;

-- DropIndex
DROP INDEX `memberships_learning_group_id_fkey` ON `memberships`;

-- DropIndex
DROP INDEX `memberships_organization_unit_id_fkey` ON `memberships`;

-- AlterTable
ALTER TABLE `assignments` ADD COLUMN `attempt_limit` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `lessons` ADD COLUMN `content_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `organization_units` ADD COLUMN `entra_group_id` VARCHAR(191) NULL,
    ADD COLUMN `sync_source` ENUM('MANUAL', 'ENTRA_SYNC') NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE `user_assignment_instances` ADD COLUMN `content_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `entra_object_id` VARCHAR(191) NULL,
    ADD COLUMN `profile_picture_manually_set` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `contents` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `provider_type` ENUM('SCORM_1_2') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category_id` VARCHAR(191) NULL,
    `author` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `content_group_id` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `storage_path_zip` VARCHAR(191) NOT NULL,
    `storage_path_extracted` VARCHAR(191) NOT NULL,
    `launch_file` VARCHAR(191) NOT NULL,
    `manifest_data` JSON NOT NULL,
    `thumbnail_path` VARCHAR(191) NULL,
    `certificate_setting` VARCHAR(191) NOT NULL DEFAULT 'IGNORE',
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_tags` (
    `id` VARCHAR(191) NOT NULL,
    `content_id` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_categories` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `parent_category_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `user_assignment_instance_id` VARCHAR(191) NOT NULL,
    `attempt_number` INTEGER NOT NULL,
    `lesson_status` ENUM('PASSED', 'COMPLETED', 'FAILED', 'INCOMPLETE', 'BROWSED', 'NOT_ATTEMPTED') NOT NULL,
    `score_raw` DECIMAL(10, 2) NULL,
    `score_min` DECIMAL(10, 2) NULL,
    `score_max` DECIMAL(10, 2) NULL,
    `session_time_seconds` INTEGER NULL,
    `lesson_location` VARCHAR(191) NULL,
    `suspend_data` TEXT NULL,
    `objectives` JSON NULL,
    `interactions` JSON NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `identity_provider_configs` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `provider_type` ENUM('LOCAL', 'MICROSOFT_ENTRA') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `tenant_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `client_secret_encrypted` VARCHAR(191) NULL,
    `redirect_uri` VARCHAR(191) NULL,
    `login_mode` ENUM('LOCAL_ONLY', 'MICROSOFT_ONLY', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `import_strategy` ENUM('ALL_USERS', 'SELECTED_GROUPS', 'FIRST_LOGIN', 'SELECTED_GROUPS_AND_FIRST_LOGIN') NOT NULL DEFAULT 'FIRST_LOGIN',
    `default_synced_user_role_id` VARCHAR(191) NULL,
    `last_sync_at` DATETIME(3) NULL,
    `last_sync_status` ENUM('SUCCESS', 'PARTIAL_FAILURE', 'FAILED', 'NEVER_RUN') NOT NULL DEFAULT 'NEVER_RUN',

    UNIQUE INDEX `identity_provider_configs_company_id_provider_type_key`(`company_id`, `provider_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entra_group_selections` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `entra_group_id` VARCHAR(191) NOT NULL,
    `entra_group_name` VARCHAR(191) NOT NULL,
    `identity_provider_config_id` VARCHAR(191) NULL,

    UNIQUE INDEX `entra_group_selections_company_id_entra_group_id_key`(`company_id`, `entra_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_logs` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `status` ENUM('SUCCESS', 'PARTIAL_FAILURE', 'FAILED', 'NEVER_RUN') NOT NULL,
    `users_processed` INTEGER NOT NULL DEFAULT 0,
    `users_failed` INTEGER NOT NULL DEFAULT 0,
    `groups_processed` INTEGER NOT NULL DEFAULT 0,
    `error_details` JSON NULL,
    `triggered_by` ENUM('SCHEDULED', 'MANUAL') NOT NULL,
    `triggered_by_user_id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `organization_units_company_id_entra_group_id_key` ON `organization_units`(`company_id`, `entra_group_id`);

-- CreateIndex
CREATE UNIQUE INDEX `users_companyId_entra_object_id_key` ON `users`(`companyId`, `entra_object_id`);

-- AddForeignKey
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_organization_unit_id_fkey` FOREIGN KEY (`organization_unit_id`) REFERENCES `organization_units`(`id`) ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_learning_group_id_fkey` FOREIGN KEY (`learning_group_id`) REFERENCES `learning_groups`(`id`) ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_content_id_fkey` FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_assignment_instances` ADD CONSTRAINT `user_assignment_instances_content_id_fkey` FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contents` ADD CONSTRAINT `contents_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contents` ADD CONSTRAINT `contents_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `content_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contents` ADD CONSTRAINT `contents_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_tags` ADD CONSTRAINT `content_tags_content_id_fkey` FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_categories` ADD CONSTRAINT `content_categories_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_categories` ADD CONSTRAINT `content_categories_parent_category_id_fkey` FOREIGN KEY (`parent_category_id`) REFERENCES `content_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_attempts` ADD CONSTRAINT `content_attempts_user_assignment_instance_id_fkey` FOREIGN KEY (`user_assignment_instance_id`) REFERENCES `user_assignment_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `identity_provider_configs` ADD CONSTRAINT `identity_provider_configs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `identity_provider_configs` ADD CONSTRAINT `identity_provider_configs_default_synced_user_role_id_fkey` FOREIGN KEY (`default_synced_user_role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entra_group_selections` ADD CONSTRAINT `entra_group_selections_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entra_group_selections` ADD CONSTRAINT `entra_group_selections_identity_provider_config_id_fkey` FOREIGN KEY (`identity_provider_config_id`) REFERENCES `identity_provider_configs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_triggered_by_user_id_fkey` FOREIGN KEY (`triggered_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
