import type { RequestHandler } from "express";
import * as service from "./reports.service.js";

export const summary: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.summary(req.tenantId!, req.query.from as string | undefined, req.query.to as string | undefined));
  } catch (error) {
    return next(error);
  }
};
