import type { RequestHandler } from "express";
import * as service from "./coupons.service.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createCoupon(req.tenantId!, req.body));
  } catch (error) {
    return next(error);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listCoupons(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};
