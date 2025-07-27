/*
  Warnings:

  - Made the column `relation` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Student` MODIFY `relation` LONGTEXT NOT NULL;
