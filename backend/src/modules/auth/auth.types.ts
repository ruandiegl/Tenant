export type RequestAuth = {
  userId: string;
  tenantId?: string;
  tenantUserId?: string;
  role?: string;
  permissions: string[];
  branchId?: string;
};
