import { Branch } from "../types/database";
import { onlyDigits } from "../utils/input-masks";
import { protectedApi } from "./api";

type BackendBranch = Omit<Branch, "address"> & {
  address?: Branch["address"] & {
    latitude?: string | number | null;
    longitude?: string | number | null;
  };
};

export type BranchPayload = {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE" | "CLOSED_TEMPORARILY";
  acceptsDelivery?: boolean;
  acceptsPickup?: boolean;
  acceptsDineIn?: boolean;
  address?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
    reference?: string;
  };
};

function mapBranch(branch: BackendBranch): Branch {
  return {
    ...branch,
    phone: branch.phone ?? "",
    email: branch.email ?? "",
    address: branch.address
      ? {
          ...branch.address,
          latitude: branch.address.latitude === null || branch.address.latitude === undefined ? undefined : Number(branch.address.latitude),
          longitude: branch.address.longitude === null || branch.address.longitude === undefined ? undefined : Number(branch.address.longitude)
        }
      : undefined
  };
}

export const branchesService = {
  list: async () => (await protectedApi<BackendBranch[]>("/tenant/branches")).map(mapBranch),
  create: async (payload: BranchPayload) =>
    mapBranch(
      await protectedApi<BackendBranch>("/tenant/branches", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          phone: payload.phone ? onlyDigits(payload.phone) : undefined
        })
      })
    ),
  update: async (id: string, payload: BranchPayload) =>
    mapBranch(
      await protectedApi<BackendBranch>(`/tenant/branches/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...payload,
          phone: payload.phone ? onlyDigits(payload.phone) : undefined
        })
      })
    ),
  remove: async (id: string) =>
    protectedApi<void>(`/tenant/branches/${id}`, {
      method: "DELETE"
    })
};
