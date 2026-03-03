/*
  Warnings:

  - You are about to drop the column `collectionId` on the `SizeChartAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `SizeChartAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `tag` on the `SizeChartAssignment` table. All the data in the column will be lost.
  - Added the required column `scope` to the `SizeChartAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SizeChartAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "scope" TEXT NOT NULL,
    "scopeValue" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SizeChartAssignment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SizeChartAssignment_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "SizeChart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SizeChartAssignment" ("chartId", "createdAt", "id", "priority", "shopId", "updatedAt") SELECT "chartId", "createdAt", "id", "priority", "shopId", "updatedAt" FROM "SizeChartAssignment";
DROP TABLE "SizeChartAssignment";
ALTER TABLE "new_SizeChartAssignment" RENAME TO "SizeChartAssignment";
CREATE INDEX "SizeChartAssignment_shopId_priority_idx" ON "SizeChartAssignment"("shopId", "priority");
CREATE INDEX "SizeChartAssignment_shopId_scope_scopeValue_idx" ON "SizeChartAssignment"("shopId", "scope", "scopeValue");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
