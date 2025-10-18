/*
  Warnings:

  - You are about to drop the `FindPeers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `FindPeers`;

-- CreateTable
CREATE TABLE `Project` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `subscribers` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Project_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
