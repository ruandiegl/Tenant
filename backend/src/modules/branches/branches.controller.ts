import type { RequestHandler } from "express";
import * as service from "./branches.service.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createBranch(req.tenantId!, req.body));
  } catch (error) {
    return next(error);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listBranches(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateBranch(req.tenantId!, req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
};
