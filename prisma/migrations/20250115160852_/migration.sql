-- CreateTable
CREATE TABLE `Student` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` DOUBLE NOT NULL,
    `photoUrl` VARCHAR(191) NOT NULL,
    `correctionTotal` INTEGER NOT NULL DEFAULT 0,
    `correctionPositive` INTEGER NOT NULL DEFAULT 0,
    `correctionNegative` INTEGER NOT NULL DEFAULT 0,
    `correctionPercentage` DOUBLE NOT NULL DEFAULT 0,
    `correctionPoints` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `wallet` INTEGER NOT NULL,
    `activityData` JSON NOT NULL,
    `blackholeTimer` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UpdateTimestamp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
