import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: ".env.example" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  PUBLIC_BACKEND_URL: z.string().url().default("http://localhost:3333"),
  ASAAS_API_URL: z.string().url().default("https://api-sandbox.asaas.com"),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  ASAAS_PIX_DUE_DAYS: z.coerce.number().int().min(0).max(30).default(1),
  WAHA_BASE_URL: z.string().url().default("http://localhost:3000"),
  WAHA_API_KEY: z.string().optional(),
  WAHA_WEBHOOK_SECRET: z.string().optional(),
  WAHA_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
  WHATSAPP_PROVIDER: z.enum(["WAHA", "BAILEYS"]).default("BAILEYS"),
  WHATSAPP_AUTO_REPLY_DELAY_MS: z.coerce.number().int().min(0).max(10_000).default(2_000),
  WHATSAPP_AUTO_REPLY_COOLDOWN_MS: z.coerce.number().int().min(0).max(24 * 60 * 60_000).default(2 * 60_000),
  WHATSAPP_SEND_MIN_DELAY_MS: z.coerce.number().int().min(0).max(60_000).default(750),
  WHATSAPP_SEND_MAX_DELAY_MS: z.coerce.number().int().min(0).max(120_000).default(2_500),
  WHATSAPP_SEND_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  BAILEYS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(30_000),
  BAILEYS_DEFAULT_QUERY_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(30_000),
  BAILEYS_KEEP_ALIVE_INTERVAL_MS: z.coerce.number().int().min(5_000).max(120_000).default(20_000),
  BAILEYS_QR_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(180_000).default(60_000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120)
});

export const env = envSchema.parse(process.env);
