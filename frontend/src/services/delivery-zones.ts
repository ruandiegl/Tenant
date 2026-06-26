import { DeliveryZone } from "../types/database";
import { api, protectedApi } from "./api";

type BackendDeliveryZone = Omit<DeliveryZone, "fee" | "minimumOrderValue" | "radiusKm"> & {
  fee: string | number;
  minimumOrderValue: string | number;
  radiusKm?: string | number | null;
};

export type DeliveryZonePayload = {
  branchId: string;
  name: string;
  type: "POSTAL_CODE" | "RADIUS";
  postalCodeStart?: string;
  postalCodeEnd?: string;
  radiusKm?: number;
  fee: number;
  minimumOrderValue: number;
  estimatedMinutes?: number;
  status: "ACTIVE" | "INACTIVE";
};

function mapDeliveryZone(zone: BackendDeliveryZone): DeliveryZone {
  return {
    ...zone,
    postalCodeStart: zone.postalCodeStart ?? undefined,
    postalCodeEnd: zone.postalCodeEnd ?? undefined,
    radiusKm: zone.radiusKm === null || zone.radiusKm === undefined ? undefined : Number(zone.radiusKm),
    fee: Number(zone.fee),
    minimumOrderValue: Number(zone.minimumOrderValue),
    estimatedMinutes: zone.estimatedMinutes ?? undefined
  };
}

export const deliveryZonesService = {
  list: async () => (await protectedApi<BackendDeliveryZone[]>("/tenant/delivery-zones")).map(mapDeliveryZone),
  create: async (payload: DeliveryZonePayload) =>
    mapDeliveryZone(
      await protectedApi<BackendDeliveryZone>("/tenant/delivery-zones", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    ),
  update: async (id: string, payload: DeliveryZonePayload) =>
    mapDeliveryZone(
      await protectedApi<BackendDeliveryZone>(`/tenant/delivery-zones/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      })
    ),
  remove: async (id: string) =>
    protectedApi<void>(`/tenant/delivery-zones/${id}`, {
      method: "DELETE"
    }),
  listPublic: async (tenantSlug: string) => (await api<BackendDeliveryZone[]>(`/public/${tenantSlug}/delivery-zones`)).map(mapDeliveryZone)
};
