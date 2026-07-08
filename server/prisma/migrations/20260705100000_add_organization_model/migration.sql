-- AlterTable (Company extension)
ALTER TABLE `companies` ADD COLUMN `domain` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `settings` JSON NULL;

-- CreateTable (OrganizationUnit)
CREATE TABLE `organization_units` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `deleted_at` DATETIME(3) NULL,
    `permanent_delete_at` DATETIME(3) NULL,
    `deletion_batch_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable (LearningGroup)
CREATE TABLE `learning_groups` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `parent_group_id` VARCHAR(191) NULL,
    `type` ENUM('STATIC', 'DYNAMIC') NOT NULL DEFAULT 'STATIC',
    `is_temporary` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NULL,
    `reminder_sent_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `permanent_delete_at` DATETIME(3) NULL,
    `deletion_batch_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable (Membership)
CREATE TABLE `memberships` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `organization_unit_id` VARCHAR(191) NULL,
    `learning_group_id` VARCHAR(191) NULL,
    `membership_type` ENUM('MEMBER', 'MANAGER') NOT NULL,
    `status` ENUM('ACTIVE', 'PENDING', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `source` ENUM('MANUAL', 'AZURE_AD', 'LDAP', 'HR_IMPORT', 'API') NOT NULL DEFAULT 'MANUAL',
    `created_by_id` VARCHAR(191) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `deletion_batch_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT `memberships_exclusive_target_check` CHECK (
        (`organization_unit_id` IS NOT NULL AND `learning_group_id` IS NULL) OR
        (`organization_unit_id` IS NULL AND `learning_group_id` IS NOT NULL)
    ),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey (OrganizationUnit to Company)
ALTER TABLE `organization_units` ADD CONSTRAINT `organization_units_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (OrganizationUnit self-relation)
ALTER TABLE `organization_units` ADD CONSTRAINT `organization_units_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `organization_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (LearningGroup to Company)
ALTER TABLE `learning_groups` ADD CONSTRAINT `learning_groups_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (LearningGroup self-relation)
ALTER TABLE `learning_groups` ADD CONSTRAINT `learning_groups_parent_group_id_fkey` FOREIGN KEY (`parent_group_id`) REFERENCES `learning_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (Membership to User)
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (Membership to OrganizationUnit)
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_organization_unit_id_fkey` FOREIGN KEY (`organization_unit_id`) REFERENCES `organization_units`(`id`) ON DELETE CASCADE;

-- AddForeignKey (Membership to LearningGroup)
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_learning_group_id_fkey` FOREIGN KEY (`learning_group_id`) REFERENCES `learning_groups`(`id`) ON DELETE CASCADE;

-- AddForeignKey (Membership creator)
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE CASCADE;
