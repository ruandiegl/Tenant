import type { RequestHandler } from "express";
import * as service from "./kitchen.service.js";

export const list: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listKitchenOrders(req.tenantId!, req.query.branchId as string | undefined, req.query.status as never));
  } catch (error) {
    return next(error);
  }
};

export const updateStatus: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateKitchenStatus(req.tenantId!, req.params.id, req.body.status, req.auth?.userId, req.body.reason));
  } catch (error) {
    return next(error);
  }
};
