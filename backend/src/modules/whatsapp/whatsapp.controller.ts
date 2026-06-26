import type { RequestHandler } from "express";
import * as service from "./whatsapp.service.js";

export const getSession: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getSession(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const createOrStartSession: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createOrStartSession(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const refreshQr: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.refreshSessionQr(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const stopSession: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.stopSession(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const updateSettings: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateSettings(req.tenantId!, req.body));
  } catch (error) {
    return next(error);
  }
};

export const sendTestMessage: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.sendTextMessage(req.tenantId!, req.body.phone, req.body.message));
  } catch (error) {
    return next(error);
  }
};

export const webhook: RequestHandler = async (req, res, next) => {
  try {
    return res.json(
      await service.handleWebhook(
        req.body,
        req.rawBody,
        req.headers,
        typeof req.query.secret === "string" ? req.query.secret : undefined
      )
    );
  } catch (error) {
    return next(error);
  }
};
