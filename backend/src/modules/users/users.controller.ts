import type { RequestHandler } from "express";
import * as service from "./users.service.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createTenantUser(req.tenantId!, req.body));
  } catch (error) {
    return next(error);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listTenantUsers(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateTenantUser(req.tenantId!, req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
};
