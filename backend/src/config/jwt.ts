import jwt from "jsonwebtoken";
import { env } from "./env.js";
import type { RequestAuth } from "../modules/auth/auth.types.js";

export const signAccessToken = (auth: RequestAuth) =>
  jwt.sign(auth, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as RequestAuth;
};
