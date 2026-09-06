-- CreateTable
CREATE TABLE `themes` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'READY', 'ACTIVE') NOT NULL DEFAULT 'DRAFT',
    `is_smart_cookie_default` BOOLEAN NOT NULL DEFAULT false,
    `color_values` JSON NOT NULL,
    `dark_color_values` JSON NULL,
    `general_font_id` VARCHAR(191) NULL,
    `nav_font_id` VARCHAR(191) NULL,
    `headings_font_id` VARCHAR(191) NULL,
    `buttons_font_id` VARCHAR(191) NULL,
    `forms_font_id` VARCHAR(191) NULL,
    `cards_font_id` VARCHAR(191) NULL,
    `links_font_id` VARCHAR(191) NULL,
    `status_font_id` VARCHAR(191) NULL,
    `base_font_size` INTEGER NOT NULL DEFAULT 16,
    `scheduled_activation_at` DATETIME(3) NULL,
    `scheduled_activation_failed_at` DATETIME(3) NULL,
    `scheduled_activation_failed_reason` TEXT NULL,
    `deleted_at` DATETIME(3) NULL,
    `permanent_delete_at` DATETIME(3) NULL,
    `deletion_batch_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fonts` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `family_name` VARCHAR(191) NOT NULL,
    `format` VARCHAR(191) NULL,
    `weight` VARCHAR(191) NULL,
    `style` VARCHAR(191) NULL,
    `storage_path` VARCHAR(191) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `fonts_company_id_family_name_key`(`company_id`, `family_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `theme_locks` (
    `id` VARCHAR(191) NOT NULL,
    `theme_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `lock_type` ENUM('EDIT', 'TEST') NOT NULL,
    `locked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `theme_locks_theme_id_key`(`theme_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_general_font_id_fkey` FOREIGN KEY (`general_font_id`) REFERENCES `fonts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_nav_font_id_fkey` FOREIGN KEY (`nav_font_id`) REFERENCES `fonts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_headings_font_id_fkey` FOREIGN KEY (`headings_font_id`) REFERENCES `fonts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_buttons_font_id_fkey` FOREIGN KEY (`buttons_font_id`) REFERENCES `fonts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_forms_font_id_fkey` FOREIGN KEY (`forms_font_id`) REFERENCES `fonts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_cards_font_id_fkey` FOREIGN KEY (`cards_font_id`) REFERENCES `fonts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_links_font_id_fkey` FOREIGN KEY (`links_font_id`) REFERENCES `fonts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_status_font_id_fkey` FOREIGN KEY (`status_font_id`) REFERENCES `fonts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fonts` ADD CONSTRAINT `fonts_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `theme_locks` ADD CONSTRAINT `theme_locks_theme_id_fkey` FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
