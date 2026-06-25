import type { RequestHandler } from "express";
import * as service from "./tenant-settings.service.js";

export const get: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getSettings(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateSettings(req.tenantId!, req.body, req.auth?.userId));
  } catch (error) {
    return next(error);
  }
};
