import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { swaggerSpec } from "./config/swagger.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { branchesRoutes } from "./modules/branches/branches.routes.js";
import { couponsRoutes } from "./modules/coupons/coupons.routes.js";
import { kitchenRoutes } from "./modules/kitchen/kitchen.routes.js";
import { tenantMenuRoutes, publicMenuRoutes } from "./modules/menu/menu.routes.js";
import { tenantOrdersRoutes, publicOrdersRoutes } from "./modules/orders/orders.routes.js";
import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { adminTenantRoutes, publicTenantRoutes } from "./modules/tenants/tenants.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { errorMiddleware } from "./shared/middlewares/error.middleware.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", database: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    return next(error);
  }
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/auth", authRoutes);
app.use("/tenants", publicTenantRoutes);
app.use("/admin/tenants", adminTenantRoutes);
app.use("/tenant/users", usersRoutes);
app.use("/tenant/branches", branchesRoutes);
app.use("/tenant/menu", tenantMenuRoutes);
app.use("/tenant/orders", tenantOrdersRoutes);
app.use("/tenant/kitchen", kitchenRoutes);
app.use("/tenant/coupons", couponsRoutes);
app.use("/tenant/reports", reportsRoutes);
app.use("/tenant/audit-logs", auditRoutes);
app.use("/public", publicMenuRoutes);
app.use("/public", publicOrdersRoutes);

app.use(errorMiddleware);
