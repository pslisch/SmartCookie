-- AlterTable
ALTER TABLE `users` ADD COLUMN `mfa_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mfa_secret_encrypted` VARCHAR(191) NULL,
    ADD COLUMN `mfa_enabled_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `tokens` MODIFY `purpose` ENUM('INVITATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'MFA_CHALLENGE') NOT NULL;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `mfa_policy` ENUM('DISABLED', 'OPTIONAL', 'ENFORCED', 'ROLE_BASED') NOT NULL DEFAULT 'DISABLED';

-- CreateTable
CREATE TABLE `mfa_recovery_codes` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `code_hash` VARCHAR(191) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mfa_policy_roles` (
    `company_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`company_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mfa_recovery_codes` ADD CONSTRAINT `mfa_recovery_codes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mfa_policy_roles` ADD CONSTRAINT `mfa_policy_roles_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mfa_policy_roles` ADD CONSTRAINT `mfa_policy_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
