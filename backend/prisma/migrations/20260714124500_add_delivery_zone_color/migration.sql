ALTER TABLE "DeliveryZone"
ADD COLUMN "color" TEXT;

WITH ranked_radius_zones AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "branchId"
      ORDER BY "radiusKm" ASC NULLS LAST, "createdAt" ASC
    ) AS position
  FROM "DeliveryZone"
  WHERE "type" IN ('RADIUS', 'RADIUS_OVERFLOW')
)
UPDATE "DeliveryZone" zone
SET "color" = CASE ((ranked.position - 1) % 6)
  WHEN 0 THEN '#1e6b3c'
  WHEN 1 THEN '#2f80ed'
  WHEN 2 THEN '#f2994a'
  WHEN 3 THEN '#9b51e0'
  WHEN 4 THEN '#eb5757'
  ELSE '#00a887'
END
FROM ranked_radius_zones ranked
WHERE zone.id = ranked.id;
