CREATE TYPE "DeliveryCalculationMethod" AS ENUM ('NEIGHBORHOOD', 'POSTAL_CODE', 'ROUTE', 'STRAIGHT_LINE');

ALTER TABLE "TenantSettings"
ADD COLUMN "deliveryCalculationMethod" "DeliveryCalculationMethod" NOT NULL DEFAULT 'NEIGHBORHOOD';

UPDATE "TenantSettings" AS settings
SET "deliveryCalculationMethod" = inferred.method::"DeliveryCalculationMethod"
FROM (
  SELECT DISTINCT ON (zone."tenantId")
    zone."tenantId",
    CASE
      WHEN zone.type = 'NEIGHBORHOOD' THEN 'NEIGHBORHOOD'
      WHEN zone.type = 'POSTAL_CODE' THEN 'POSTAL_CODE'
      WHEN zone."distanceMode" = 'STRAIGHT_LINE' THEN 'STRAIGHT_LINE'
      ELSE 'ROUTE'
    END AS method
  FROM "DeliveryZone" AS zone
  ORDER BY zone."tenantId", zone."createdAt" ASC
) AS inferred
WHERE settings."tenantId" = inferred."tenantId";
