UPDATE "TenantSettings"
SET "deliveryCalculationMethod" = 'STRAIGHT_LINE'
WHERE "deliveryCalculationMethod" IN ('POSTAL_CODE', 'ROUTE');

UPDATE "DeliveryZone"
SET "status" = 'INACTIVE'
WHERE "type" = 'POSTAL_CODE';

UPDATE "DeliveryZone"
SET "distanceMode" = 'STRAIGHT_LINE'
WHERE "type" IN ('RADIUS', 'RADIUS_OVERFLOW');
