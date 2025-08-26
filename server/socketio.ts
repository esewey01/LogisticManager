// SOCKET-INTEGRATION: Chat en tiempo real
import { Server as SocketIOServer } from "socket.io";
import type { Server } from "http";

export function attachSockets(httpServer: Server) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on("connection", (socket) => {
    console.log("Usuario conectado al chat:", socket.id);

    // Mensaje recibido
    socket.on("chat:message", (msg) => {
      // Estructura esperada: { user: string, text: string }
      const payload = { ...msg, ts: Date.now(), id: socket.id };
      console.log("Mensaje de chat:", payload);
      io.emit("chat:message", payload); // broadcast a todos
    });

    socket.on("disconnect", () => {
      console.log("Usuario desconectado del chat:", socket.id);
    });
  });

  return io;
}