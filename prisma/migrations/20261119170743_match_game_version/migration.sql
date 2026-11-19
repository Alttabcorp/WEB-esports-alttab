-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "gameVersion" TEXT;

-- CreateIndex
CREATE INDEX "Match_gameVersion_idx" ON "Match"("gameVersion");
