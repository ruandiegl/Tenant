import type { RequestHandler } from "express";
import type { Request } from "express";
import * as service from "./tenant-management.service.js";

function actorFromRequest(req: Request) {
  return {
    userId: req.auth?.userId,
    ip: req.ip,
    userAgent: req.header("user-agent")
  };
}

export const plans: RequestHandler = async (_req, res, next) => {
  try {
    return res.json(await service.listPlans());
  } catch (error) {
    return next(error);
  }
};

export const createPlan: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createPlan(req.body, actorFromRequest(req)));
  } catch (error) {
    return next(error);
  }
};

export const updatePlanConfig: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updatePlan(req.params.planId, req.body, actorFromRequest(req)));
  } catch (error) {
    return next(error);
  }
};

export const removePlan: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.deletePlan(req.params.planId, actorFromRequest(req)));
  } catch (error) {
    return next(error);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listTenants(req.query as never));
  } catch (error) {
    return next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createTenant(req.body, actorFromRequest(req)));
  } catch (error) {
    return next(error);
  }
};

export const detail: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getTenant(req.params.id));
  } catch (error) {
    return next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateTenant(req.params.id, req.body, actorFromRequest(req)));
  } catch (error) {
    return next(error);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await service.deleteTenant(req.params.id, actorFromRequest(req));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const updateStatus: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateTenantStatus(req.params.id, req.body.status, req.body.reason, actorFromRequest(req)));
  } catch (error) {
    return next(error);
  }
};

export const updatePlan: RequestHandler = async (req, res, next) => {
  try {
    return res.json(
      await service.updateTenantPlan(req.params.id, req.body.planId, req.body.planName, req.body.reason, actorFromRequest(req))
    );
  } catch (error) {
    return next(error);
  }
};

export const inviteLink: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.createInviteLink(req.params.id, req.params.tenantUserId, actorFromRequest(req)));
  } catch (error) {
    return next(error);
  }
};

export const usage: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getTenantUsage(req.params.id));
  } catch (error) {
    return next(error);
  }
};

export const auditLogs: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listAuditLogs(req.query as never));
  } catch (error) {
    return next(error);
  }
};
