-- AlterTable
ALTER TABLE `users` MODIFY `passwordHash` VARCHAR(191) NULL,
    MODIFY `recoveryEmail` VARCHAR(191) NULL;

-- Add CHECK constraint to users to ensure active users have passwordHash not null
ALTER TABLE `users` ADD CONSTRAINT `users_active_password_check` CHECK (`status` <> 'ACTIVE' OR `passwordHash` IS NOT NULL);

