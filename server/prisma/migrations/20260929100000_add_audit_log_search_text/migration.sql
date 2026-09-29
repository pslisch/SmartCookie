-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `search_text` TEXT NULL;

-- CreateIndex
CREATE FULLTEXT INDEX `audit_logs_search_text_idx` ON `audit_logs`(`search_text`);
