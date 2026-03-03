-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SizeChart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'cm',
    "columns" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SizeChart_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SizeChartRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chartId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "values" JSONB NOT NULL,
    CONSTRAINT "SizeChartRow_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "SizeChart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SizeChartAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "productId" TEXT,
    "collectionId" TEXT,
    "tag" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SizeChartAssignment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SizeChartAssignment_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "SizeChart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shop_key" ON "Shop"("shop");

-- CreateIndex
CREATE INDEX "Shop_shop_idx" ON "Shop"("shop");

-- CreateIndex
CREATE INDEX "SizeChart_shopId_idx" ON "SizeChart"("shopId");

-- CreateIndex
CREATE INDEX "SizeChart_shopId_isDefault_idx" ON "SizeChart"("shopId", "isDefault");

-- CreateIndex
CREATE INDEX "SizeChartRow_chartId_sortOrder_idx" ON "SizeChartRow"("chartId", "sortOrder");

-- CreateIndex
CREATE INDEX "SizeChartAssignment_shopId_productId_idx" ON "SizeChartAssignment"("shopId", "productId");

-- CreateIndex
CREATE INDEX "SizeChartAssignment_shopId_collectionId_idx" ON "SizeChartAssignment"("shopId", "collectionId");

-- CreateIndex
CREATE INDEX "SizeChartAssignment_shopId_tag_idx" ON "SizeChartAssignment"("shopId", "tag");

-- CreateIndex
CREATE INDEX "SizeChartAssignment_shopId_priority_idx" ON "SizeChartAssignment"("shopId", "priority");
