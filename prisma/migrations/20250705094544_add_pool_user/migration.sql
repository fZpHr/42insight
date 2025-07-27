-- CreateTable
CREATE TABLE `PoolUser` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` DOUBLE NOT NULL,
    `photoUrl` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `correctionPoints` INTEGER NOT NULL,
    `correctionTotal` INTEGER NOT NULL DEFAULT 0,
    `correctionPositive` INTEGER NOT NULL DEFAULT 0,
    `correctionNegative` INTEGER NOT NULL DEFAULT 0,
    `correctionPercentage` DOUBLE NOT NULL DEFAULT 0,
    `activityData` JSON NOT NULL,
    `examGrades` JSON NOT NULL,
    `year` INTEGER NOT NULL,
    `wallet` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
