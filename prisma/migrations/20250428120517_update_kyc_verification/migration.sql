/*
  Warnings:

  - You are about to drop the column `id_image_url` on the `KycVerification` table. All the data in the column will be lost.
  - You are about to drop the column `selfie_image_url` on the `KycVerification` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `KycVerification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KycVerification" DROP COLUMN "id_image_url",
DROP COLUMN "selfie_image_url",
DROP COLUMN "status",
ADD COLUMN     "document_number" TEXT,
ADD COLUMN     "document_type" TEXT,
ADD COLUMN     "verification_data" JSONB,
ADD COLUMN     "verification_status" TEXT;
