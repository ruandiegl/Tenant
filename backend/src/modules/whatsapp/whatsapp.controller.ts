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
    return res.json(await service.sendTextMessage(req.tenantId!, req.body.phone, req.body.message, { source: "test" }));
  } catch (error) {
    return next(error);
  }
};

export const getHealth: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getWahaConnectivityHealth(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const deleteMessage: RequestHandler = async (req, res, next) => {
  try {
    await service.deleteMessage(req.tenantId!, req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const listTemplates: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listTemplates(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const updateTemplate: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateTemplate(req.tenantId!, req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
};

export const deleteTemplate: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.deleteTemplate(req.tenantId!, req.params.id));
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
