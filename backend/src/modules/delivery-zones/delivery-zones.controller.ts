import type { RequestHandler } from "express";
import * as service from "./delivery-zones.service.js";

export const list: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listDeliveryZones(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const listPublic: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listPublicDeliveryZones(req.params.tenantSlug));
  } catch (error) {
    return next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createDeliveryZone(req.tenantId!, req.body, req.auth?.userId));
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateDeliveryZone(req.tenantId!, req.params.id, req.body, req.auth?.userId));
  } catch (error) {
    return next(error);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await service.deleteDeliveryZone(req.tenantId!, req.params.id, req.auth?.userId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
