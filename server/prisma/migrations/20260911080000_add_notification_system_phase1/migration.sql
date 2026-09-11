-- AlterTable
ALTER TABLE `notification_preferences`
    ADD COLUMN `email_enabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `in_lms_enabled` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `notification_type` ENUM('LESSON_ASSIGNED', 'REMINDER', 'DUE_SOON', 'OVERDUE', 'COMPLETION_CONFIRMATION', 'CERTIFICATES', 'SYSTEM_ANNOUNCEMENTS', 'MANAGER_COMPLETION', 'MANAGER_OVERDUE') NOT NULL;

-- Migrate existing preference data
UPDATE `notification_preferences` SET `email_enabled` = `enabled`;

-- Drop old enabled column
ALTER TABLE `notification_preferences` DROP COLUMN `enabled`;

-- CreateTable
CREATE TABLE `notification_rules` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `notification_type` ENUM('LESSON_ASSIGNED', 'REMINDER', 'DUE_SOON', 'OVERDUE', 'COMPLETION_CONFIRMATION', 'CERTIFICATES', 'SYSTEM_ANNOUNCEMENTS', 'MANAGER_COMPLETION', 'MANAGER_OVERDUE') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `mandatory` BOOLEAN NOT NULL DEFAULT false,
    `recipient_config` JSON NOT NULL,
    `channels` JSON NOT NULL,
    `conditions` JSON NULL,
    `title_key` VARCHAR(191) NULL,
    `body_key` VARCHAR(191) NULL,
    `action_type` VARCHAR(191) NULL,
    `action_url` VARCHAR(191) NULL,
    `is_system_default` BOOLEAN NOT NULL DEFAULT false,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_instances` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `rule_id` VARCHAR(191) NULL,
    `source_event_type` VARCHAR(191) NOT NULL,
    `source_event_id` VARCHAR(191) NULL,
    `title_key` VARCHAR(191) NULL,
    `title_params` JSON NULL,
    `body_key` VARCHAR(191) NULL,
    `body_params` JSON NULL,
    `action_type` VARCHAR(191) NULL,
    `action_entity_type` VARCHAR(191) NULL,
    `action_entity_id` VARCHAR(191) NULL,
    `action_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `notification_instances_rule_id_source_event_type_source_even_key`(`rule_id`, `source_event_type`, `source_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `notification_instance_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `notification_recipients_notification_instance_id_user_id_key`(`notification_instance_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `notification_recipient_id` VARCHAR(191) NOT NULL,
    `channel` ENUM('IN_LMS', 'EMAIL') NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED', 'RETRIED', 'PERMANENTLY_FAILED') NOT NULL DEFAULT 'PENDING',
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `last_attempt_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `read_at` DATETIME(3) NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification_rules` ADD CONSTRAINT `notification_rules_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_rules` ADD CONSTRAINT `notification_rules_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_instances` ADD CONSTRAINT `notification_instances_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_instances` ADD CONSTRAINT `notification_instances_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `notification_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_recipients` ADD CONSTRAINT `notification_recipients_notification_instance_id_fkey` FOREIGN KEY (`notification_instance_id`) REFERENCES `notification_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_recipients` ADD CONSTRAINT `notification_recipients_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_deliveries` ADD CONSTRAINT `notification_deliveries_notification_recipient_id_fkey` FOREIGN KEY (`notification_recipient_id`) REFERENCES `notification_recipients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
