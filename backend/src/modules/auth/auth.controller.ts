import type { RequestHandler } from "express";
import * as authService from "./auth.service.js";

export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.login(req.body.email, req.body.password, req.body.tenantSlug);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const invite: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.getInvite(req.params.token);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const acceptInvite: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.acceptInvite(req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.getMe(req.auth!.userId, req.auth?.tenantId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.updateProfile(req.auth!.userId, req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const logout: RequestHandler = (_req, res) => {
  return res.status(204).send();
};
