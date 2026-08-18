-- Additive-only operational metadata for the Tiny catalog synchronization.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastTinySyncAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "classificationStatus" TEXT NOT NULL DEFAULT 'CLASSIFIED';

CREATE UNIQUE INDEX IF NOT EXISTS "ProductImage_productId_url_key" ON "ProductImage"("productId", "url");

CREATE TABLE IF NOT EXISTS "TinySyncRun" (
  "id" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "processed" INTEGER NOT NULL DEFAULT 0,
  "created" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "unchanged" INTEGER NOT NULL DEFAULT 0,
  "inactivated" INTEGER NOT NULL DEFAULT 0,
  "notFound" INTEGER NOT NULL DEFAULT 0,
  "errors" INTEGER NOT NULL DEFAULT 0,
  "review" INTEGER NOT NULL DEFAULT 0,
  "errorSummary" JSONB,
  CONSTRAINT "TinySyncRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TinySyncRun_startedAt_idx" ON "TinySyncRun"("startedAt");
CREATE INDEX IF NOT EXISTS "TinySyncRun_status_idx" ON "TinySyncRun"("status");

CREATE TABLE IF NOT EXISTS "TinySyncLock" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TinySyncLock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TinySyncLock_token_key" ON "TinySyncLock"("token");
