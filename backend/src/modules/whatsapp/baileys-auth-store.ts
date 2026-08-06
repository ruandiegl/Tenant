import type { AuthenticationState, SignalDataSet, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { proto } from "@whiskeysockets/baileys/WAProto/index.js";
import { initAuthCreds } from "@whiskeysockets/baileys/lib/Utils/auth-utils.js";
import { BufferJSON } from "@whiskeysockets/baileys/lib/Utils/generics.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

const CREDS_KEY = "creds";

const authKey = (type: keyof SignalDataTypeMap, id: string) => `${type}-${id}`;

const serializeAuthValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value, BufferJSON.replacer)) as Prisma.InputJsonValue;

const deserializeAuthValue = <T>(value: Prisma.JsonValue): T =>
  JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;

const saveAuthValue = async (tenantId: string, sessionId: string, key: string, value: unknown) => {
  await prisma.whatsappAuthState.upsert({
    where: { sessionId_key: { sessionId, key } },
    create: {
      tenantId,
      sessionId,
      key,
      value: serializeAuthValue(value)
    },
    update: {
      value: serializeAuthValue(value)
    }
  });
};

const readAuthValue = async <T>(sessionId: string, key: string) => {
  const record = await prisma.whatsappAuthState.findUnique({
    where: { sessionId_key: { sessionId, key } }
  });

  return record ? deserializeAuthValue<T>(record.value) : null;
};

export const usePrismaBaileysAuthState = async (tenantId: string, sessionId: string) => {
  const creds = (await readAuthValue<AuthenticationState["creds"]>(sessionId, CREDS_KEY)) ?? initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const records = await prisma.whatsappAuthState.findMany({
          where: {
            sessionId,
            key: { in: ids.map((id) => authKey(type, id)) }
          }
        });
        const byKey = new Map(records.map((record) => [record.key, record.value]));
        const data: { [id: string]: SignalDataTypeMap[T] } = {};

        for (const id of ids) {
          const value = byKey.get(authKey(type, id));
          if (!value) continue;

          let parsed = deserializeAuthValue<SignalDataTypeMap[T]>(value);
          if (type === "app-state-sync-key" && parsed) {
            parsed = proto.Message.AppStateSyncKeyData.fromObject(parsed as Record<string, unknown>) as unknown as SignalDataTypeMap[T];
          }
          data[id] = parsed;
        }

        return data;
      },
      set: async (data: SignalDataSet) => {
        const operations: Prisma.PrismaPromise<unknown>[] = [];

        for (const type of Object.keys(data) as Array<keyof SignalDataSet>) {
          const values = data[type];
          if (!values) continue;

          for (const id of Object.keys(values)) {
            const key = authKey(type, id);
            const value = values[id];

            operations.push(
              value
                ? prisma.whatsappAuthState.upsert({
                    where: { sessionId_key: { sessionId, key } },
                    create: {
                      tenantId,
                      sessionId,
                      key,
                      value: serializeAuthValue(value)
                    },
                    update: {
                      value: serializeAuthValue(value)
                    }
                  })
                : prisma.whatsappAuthState.deleteMany({
                    where: { sessionId, key }
                  })
            );
          }
        }

        if (operations.length) {
          await prisma.$transaction(operations);
        }
      },
      clear: async () => {
        await prisma.whatsappAuthState.deleteMany({ where: { sessionId } });
      }
    }
  };

  return {
    state,
    saveCreds: () => saveAuthValue(tenantId, sessionId, CREDS_KEY, state.creds),
    clearCreds: () => prisma.whatsappAuthState.deleteMany({ where: { sessionId } })
  };
};
