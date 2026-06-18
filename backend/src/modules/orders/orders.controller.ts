import type { RequestHandler } from "express";
import * as service from "./orders.service.js";

export const createPublic: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createPublicOrder(req.params.tenantSlug, req.body));
  } catch (error) {
    return next(error);
  }
};

export const getPublic: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getPublicOrder(req.params.tenantSlug, req.params.publicCode));
  } catch (error) {
    return next(error);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listTenantOrders(req.tenantId!, req.query.branchId as string | undefined, req.query.status as never));
  } catch (error) {
    return next(error);
  }
};

export const getOne: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getTenantOrder(req.tenantId!, req.params.id));
  } catch (error) {
    return next(error);
  }
};

export const updateStatus: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateOrderStatus(req.tenantId!, req.params.id, req.body.status, req.auth?.userId, req.body.reason));
  } catch (error) {
    return next(error);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateOrderStatus(req.tenantId!, req.params.id, "CANCELLED", req.auth?.userId, req.body.reason));
  } catch (error) {
    return next(error);
  }
};
