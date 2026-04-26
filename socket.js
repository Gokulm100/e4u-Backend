import { Server } from "socket.io";

let ioInstance = null;

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  ioInstance.on("connection", (socket) => {
    const userIdFromHandshake = socket.handshake?.auth?.userId;
    if (userIdFromHandshake) {
      socket.join(`user:${userIdFromHandshake}`);
    }

    socket.on("join", (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });

    socket.on("leave", (userId) => {
      if (!userId) return;
      socket.leave(`user:${userId}`);
    });
  });

  return ioInstance;
};

export const getSocket = () => ioInstance;
