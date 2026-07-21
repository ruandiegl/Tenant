import type { RequestHandler } from "express";
import * as service from "./payments.service.js";

export const handleAsaasWebhook: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.handleAsaasWebhook(req.body, req.headers));
  } catch (error) {
    return next(error);
  }
};
