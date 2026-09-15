-- CreateEnum
CREATE TYPE "WhatsappTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "TemplateSource" AS ENUM ('AI', 'PREDEFINED', 'MANUAL');

-- Rebuild TemplateStatus so submitted Meta templates use PENDING and disabled templates are tracked.
ALTER TABLE "MessageTemplate" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "TemplateStatus" RENAME TO "TemplateStatus_old";

CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED');

ALTER TABLE "MessageTemplate"
ALTER COLUMN "status" TYPE "TemplateStatus"
USING (
  CASE "status"::text
    WHEN 'SUBMITTED' THEN 'PENDING'::"TemplateStatus"
    WHEN 'APPROVED' THEN 'APPROVED'::"TemplateStatus"
    WHEN 'REJECTED' THEN 'REJECTED'::"TemplateStatus"
    WHEN 'PAUSED' THEN 'PAUSED'::"TemplateStatus"
    ELSE 'DRAFT'::"TemplateStatus"
  END
);

DROP TYPE "TemplateStatus_old";

ALTER TABLE "MessageTemplate" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "MessageTemplate"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "displayName" TEXT,
ADD COLUMN "components" JSONB,
ADD COLUMN "variables" JSONB,
ADD COLUMN "examples" JSONB,
ADD COLUMN "buttons" JSONB,
ADD COLUMN "source" "TemplateSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "metaStatus" TEXT,
ADD COLUMN "rejectedReason" TEXT;

ALTER TABLE "MessageTemplate"
ALTER COLUMN "category" TYPE "WhatsappTemplateCategory"
USING (
  CASE UPPER("category")
    WHEN 'UTILITY' THEN 'UTILITY'::"WhatsappTemplateCategory"
    WHEN 'AUTHENTICATION' THEN 'AUTHENTICATION'::"WhatsappTemplateCategory"
    ELSE 'MARKETING'::"WhatsappTemplateCategory"
  END
);

ALTER TABLE "MessageTemplate" ALTER COLUMN "category" SET DEFAULT 'MARKETING';
ALTER TABLE "MessageTemplate" ALTER COLUMN "language" SET DEFAULT 'en_US';

-- CreateIndex
CREATE INDEX "MessageTemplate_tenantId_category_idx" ON "MessageTemplate"("tenantId", "category");

-- CreateIndex
CREATE INDEX "MessageTemplate_tenantId_source_idx" ON "MessageTemplate"("tenantId", "source");

-- CreateIndex
CREATE INDEX "MessageTemplate_tenantId_createdById_idx" ON "MessageTemplate"("tenantId", "createdById");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
