/*
  Warnings:

  - Added the required column `currentProjects` to the `PoolUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PoolUser` ADD COLUMN `currentProjects` LONGTEXT NOT NULL;
