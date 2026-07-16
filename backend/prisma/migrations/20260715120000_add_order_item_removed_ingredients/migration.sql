CREATE TABLE "OrderItemRemovedIngredient" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "optionItemId" TEXT,
  "ingredientNameSnapshot" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderItemRemovedIngredient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItemRemovedIngredient_tenantId_orderItemId_idx"
ON "OrderItemRemovedIngredient"("tenantId", "orderItemId");

CREATE INDEX "OrderItemRemovedIngredient_optionItemId_idx"
ON "OrderItemRemovedIngredient"("optionItemId");

ALTER TABLE "OrderItemRemovedIngredient"
ADD CONSTRAINT "OrderItemRemovedIngredient_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItemRemovedIngredient"
ADD CONSTRAINT "OrderItemRemovedIngredient_optionItemId_fkey"
FOREIGN KEY ("optionItemId") REFERENCES "OptionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
