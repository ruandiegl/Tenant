import { env } from "./env.js";

const origins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsOrigin = origins.length === 1 ? origins[0] : origins;
