/*
  Warnings:

  - You are about to drop the `Shape` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[roomId]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Shape" DROP CONSTRAINT "Shape_roomId_fkey";

-- DropTable
DROP TABLE "public"."Shape";

-- CreateIndex
CREATE UNIQUE INDEX "Store_roomId_key" ON "public"."Store"("roomId");
