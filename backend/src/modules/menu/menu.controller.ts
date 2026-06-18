import type { RequestHandler } from "express";
import * as service from "./menu.service.js";

export const createCategory: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createCategory(req.tenantId!, req.body));
  } catch (error) {
    return next(error);
  }
};

export const listCategories: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listCategories(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const updateCategory: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateCategory(req.tenantId!, req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
};

export const deleteCategory: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.deleteCategory(req.tenantId!, req.params.id));
  } catch (error) {
    return next(error);
  }
};

export const createProduct: RequestHandler = async (req, res, next) => {
  try {
    return res.status(201).json(await service.createProduct(req.tenantId!, req.body));
  } catch (error) {
    return next(error);
  }
};

export const listProducts: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.listProducts(req.tenantId!));
  } catch (error) {
    return next(error);
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.updateProduct(req.tenantId!, req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
};

export const deleteProduct: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.deleteProduct(req.tenantId!, req.params.id));
  } catch (error) {
    return next(error);
  }
};

export const publicMenu: RequestHandler = async (req, res, next) => {
  try {
    return res.json(await service.getPublicMenu(req.params.tenantSlug, req.query.branchId as string | undefined));
  } catch (error) {
    return next(error);
  }
};
