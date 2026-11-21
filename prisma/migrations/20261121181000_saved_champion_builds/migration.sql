-- CreateTable
CREATE TABLE "SavedChampionBuild" (
    "id" TEXT NOT NULL,
    "appProfileId" TEXT NOT NULL DEFAULT 'default',
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "items" INTEGER[],
    "enemyChampionId" INTEGER,
    "enemyChampionName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedChampionBuild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedChampionBuild_appProfileId_championId_sortOrder_idx" ON "SavedChampionBuild"("appProfileId", "championId", "sortOrder");

-- CreateIndex
CREATE INDEX "SavedChampionBuild_appProfileId_championId_isDefault_idx" ON "SavedChampionBuild"("appProfileId", "championId", "isDefault");

-- AddForeignKey
ALTER TABLE "SavedChampionBuild" ADD CONSTRAINT "SavedChampionBuild_appProfileId_fkey" FOREIGN KEY ("appProfileId") REFERENCES "AppProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
