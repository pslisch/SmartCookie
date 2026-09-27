-- AlterTable
ALTER TABLE `audit_logs`
    ADD COLUMN `category` ENUM('AUTHENTICATION_SECURITY', 'PERMISSIONS_ORGANIZATION', 'LEARNING_CONTENT_ASSIGNMENTS', 'LEARNING_RESULTS', 'DELETION', 'FAILURES') NOT NULL,
    ADD COLUMN `outcome` ENUM('SUCCESS', 'FAILURE', 'RESOLVED') NOT NULL,
    ADD COLUMN `affected_object_name` VARCHAR(191) NULL,
    ADD COLUMN `additional_affected_objects` JSON NULL,
    ADD COLUMN `changes` JSON NULL,
    ADD COLUMN `auth_failure_count` INTEGER NULL,
    ADD COLUMN `resolved_at` DATETIME(3) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    RENAME COLUMN `metadata` TO `details`;

-- CreateIndex
CREATE INDEX `audit_logs_company_id_created_at_idx` ON `audit_logs`(`company_id`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_company_id_category_created_at_idx` ON `audit_logs`(`company_id`, `category`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_company_id_outcome_created_at_idx` ON `audit_logs`(`company_id`, `outcome`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_company_id_actor_id_created_at_idx` ON `audit_logs`(`company_id`, `actor_id`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_company_id_actor_id_category_outcome_action_idx` ON `audit_logs`(`company_id`, `actor_id`, `category`, `outcome`, `action`);
