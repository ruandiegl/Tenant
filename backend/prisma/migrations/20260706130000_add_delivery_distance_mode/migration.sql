CREATE TYPE "DeliveryDistanceMode" AS ENUM ('ROUTE', 'STRAIGHT_LINE');

ALTER TABLE "DeliveryZone"
ADD COLUMN "distanceMode" "DeliveryDistanceMode" NOT NULL DEFAULT 'ROUTE';
