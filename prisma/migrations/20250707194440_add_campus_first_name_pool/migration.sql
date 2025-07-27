/*
  Warnings:

  - Added the required column `firstName` to the `PoolUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PoolUser` ADD COLUMN `campus` VARCHAR(191) NULL,
    ADD COLUMN `firstName` VARCHAR(191) NOT NULL,
    ADD COLUMN `isPoolUser` BOOLEAN NOT NULL DEFAULT false;
