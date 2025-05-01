/*
  Warnings:

  - You are about to drop the column `read` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `bet_id` on the `TeamBet` table. All the data in the column will be lost.
  - You are about to drop the column `draft_size` on the `TeamBet` table. All the data in the column will be lost.
  - You are about to drop the column `team1_user_ids` on the `TeamBet` table. All the data in the column will be lost.
  - You are about to drop the column `team2_user_ids` on the `TeamBet` table. All the data in the column will be lost.
  - The `status` column on the `TeamBet` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bet_amount` to the `TeamBet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `host_id` to the `TeamBet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slot_size` to the `TeamBet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `TeamBet` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_user_id_fkey";

-- DropForeignKey
ALTER TABLE "TeamBet" DROP CONSTRAINT "TeamBet_bet_id_fkey";

-- DropIndex
DROP INDEX "TeamBet_bet_id_key";

-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "team_bet_id" INTEGER;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "read",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'unread',
ADD COLUMN     "team_bet_id" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TeamBet" DROP COLUMN "bet_id",
DROP COLUMN "draft_size",
DROP COLUMN "team1_user_ids",
DROP COLUMN "team2_user_ids",
ADD COLUMN     "bet_amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "host_id" INTEGER NOT NULL,
ADD COLUMN     "slot_size" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "TeamSlot" (
    "id" SERIAL NOT NULL,
    "team_bet_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "team_number" INTEGER NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSlot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_team_bet_id_fkey" FOREIGN KEY ("team_bet_id") REFERENCES "TeamBet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBet" ADD CONSTRAINT "TeamBet_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSlot" ADD CONSTRAINT "TeamSlot_team_bet_id_fkey" FOREIGN KEY ("team_bet_id") REFERENCES "TeamBet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSlot" ADD CONSTRAINT "TeamSlot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_team_bet_id_fkey" FOREIGN KEY ("team_bet_id") REFERENCES "TeamBet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
