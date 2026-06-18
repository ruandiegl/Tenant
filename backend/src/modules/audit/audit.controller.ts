import type { RequestHandler } from "express";
import * as service from "./audit.service.js";

export const list: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listAuditLogs(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};
