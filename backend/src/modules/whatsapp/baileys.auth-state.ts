import { AuthenticationCreds, AuthenticationState, BufferJSON, initAuthCreds, proto, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { prisma } from "../../config/prisma.js";

export async function usePrismaAuthState(
  sessionId: string,
  tenantId: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const readKey = async (key: string) => {
    try {
      const record = await prisma.whatsappAuthState.findUnique({
        where: {
          sessionId_key: {
            sessionId,
            key
          }
        }
      });

      if (!record || !record.value) return null;

      const raw = typeof record.value === "string" ? record.value : JSON.stringify(record.value);
      return JSON.parse(raw, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const writeKey = async (key: string, value: any) => {
    if (value === null || value === undefined) {
      await prisma.whatsappAuthState.deleteMany({
        where: {
          sessionId,
          key
        }
      });
      return;
    }

    const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));

    await prisma.whatsappAuthState.upsert({
      where: {
        sessionId_key: {
          sessionId,
          key
        }
      },
      create: {
        tenantId,
        sessionId,
        key,
        value: serialized
      },
      update: {
        value: serialized
      }
    });
  };

  const credsData = await readKey("creds");
  const creds: AuthenticationCreds = credsData || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: any } = {};
          await Promise.all(
            ids.map(async (id) => {
              const value = await readKey(`${type}-${id}`);
              if (value) {
                if (type === "app-state-sync-key" && value) {
                  data[id] = proto.Message.AppStateSyncKeyData.fromObject(value);
                } else {
                  data[id] = value;
                }
              }
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            const categoryData = data[category as keyof SignalDataTypeMap];
            if (categoryData) {
              for (const id in categoryData) {
                const value = categoryData[id];
                const key = `${category}-${id}`;
                tasks.push(writeKey(key, value));
              }
            }
          }
          await Promise.all(tasks);

        }
      }
    },
    saveCreds: async () => {
      await writeKey("creds", creds);
    }
  };
}
