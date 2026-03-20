CREATE TABLE IF NOT EXISTS "SizeGuideViewEvent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "chartId" TEXT,
    "productId" TEXT,
    "productHandle" TEXT,
    "productTitle" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SizeGuideViewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SizeGuideViewEvent_shopId_createdAt_idx"
  ON "SizeGuideViewEvent"("shopId", "createdAt");

CREATE INDEX IF NOT EXISTS "SizeGuideViewEvent_shopId_chartId_createdAt_idx"
  ON "SizeGuideViewEvent"("shopId", "chartId", "createdAt");

CREATE INDEX IF NOT EXISTS "SizeGuideViewEvent_shopId_productHandle_createdAt_idx"
  ON "SizeGuideViewEvent"("shopId", "productHandle", "createdAt");

CREATE INDEX IF NOT EXISTS "SizeGuideViewEvent_shopId_eventType_createdAt_idx"
  ON "SizeGuideViewEvent"("shopId", "eventType", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'SizeGuideViewEvent_shopId_fkey'
  ) THEN
    ALTER TABLE "SizeGuideViewEvent"
      ADD CONSTRAINT "SizeGuideViewEvent_shopId_fkey"
      FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'SizeGuideViewEvent_chartId_fkey'
  ) THEN
    ALTER TABLE "SizeGuideViewEvent"
      ADD CONSTRAINT "SizeGuideViewEvent_chartId_fkey"
      FOREIGN KEY ("chartId") REFERENCES "SizeChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
