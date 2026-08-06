import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { configureSocket } from "./config/socket.js";
import { whatsappQueueWorker } from "./modules/whatsapp/whatsapp.queue.js";
import { startConnectedWhatsappSessions } from "./modules/whatsapp/whatsapp.service.js";

const server = http.createServer(app);
configureSocket(server);

server.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
  console.log(`Swagger available on http://localhost:${env.PORT}/docs`);

  whatsappQueueWorker.start();

  void startConnectedWhatsappSessions().catch((error) => {
    console.error("[whatsapp] Could not start connected WhatsApp sessions", error);
  });
});

const shutdown = async () => {
  whatsappQueueWorker.stop();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
