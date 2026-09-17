import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

const isR2Configured = Boolean(
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET_NAME &&
  env.R2_PUBLIC_URL
);

const s3Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!
      }
    })
  : null;

export const r2Storage = {
  isConfigured: isR2Configured,

  upload: async (params: { key: string; body: Buffer; contentType: string }) => {
    if (!s3Client || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
      throw new Error("Cloudflare R2 is not configured");
    }

    const cleanKey = params.key.replace(/^\/+/, "").replace(/\\/g, "/");

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: cleanKey,
        Body: params.body,
        ContentType: params.contentType
      })
    );

    const publicBase = env.R2_PUBLIC_URL.replace(/\/+$/, "");
    return `${publicBase}/${cleanKey}`;
  },

  delete: async (key: string) => {
    if (!s3Client || !env.R2_BUCKET_NAME) return;
    const cleanKey = key.replace(/^\/+/, "").replace(/\\/g, "/");
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: cleanKey
      })
    );
  }
};
