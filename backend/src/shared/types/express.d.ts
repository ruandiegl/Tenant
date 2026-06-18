import type { RequestAuth } from "../../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      auth?: RequestAuth;
      tenantId?: string;
    }
  }
}

export {};
