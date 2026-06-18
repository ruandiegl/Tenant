import { prisma } from "../../config/prisma.js";

export const listAuditLogs = (tenantId: string) => {
  return prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true }
  });
};
