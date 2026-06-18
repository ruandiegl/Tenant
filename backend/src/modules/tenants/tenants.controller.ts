import type { RequestHandler } from "express";
import * as service from "./tenants.service.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    const tenant = await service.createTenant(req.body);
    return res.status(201).json(tenant);
  } catch (error) {
    return next(error);
  }
};

export const list: RequestHandler = async (_req, res, next) => {
  try {
    return res.json(await service.listTenants());
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateTenant(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
};

export const publicBySlug: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getPublicTenant(req.params.slug));
  } catch (error) {
    return next(error);
  }
};
