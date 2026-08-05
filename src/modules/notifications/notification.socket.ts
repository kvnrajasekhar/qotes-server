import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import notificationService from "./notification.service";
import { SOCKET_EVENTS } from "./notification.constants";

let io: Server | null = null;

const initializeSocket = (server: any): Server => {
  if (io) {
    console.warn("Socket.IO already initialized");
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3001",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket: Socket & { userId?: string; username?: string }, next: any) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as any;
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket & { userId?: string; username?: string }) => {
    console.log(`User connected: ${socket.userId}, Socket ID: ${socket.id}`);

    notificationService.registerUserSocket(socket.userId, socket.id);

    socket.emit(SOCKET_EVENTS.USER_REGISTERED, {
      userId: socket.userId,
      socketId: socket.id,
    });

    socket.on(SOCKET_EVENTS.REGISTER_USER, (data: any) => {
      if (data.userId === socket.userId) {
        notificationService.registerUserSocket(socket.userId, socket.id);
      }
    });

    socket.on(SOCKET_EVENTS.NOTIFICATION_READ, async (data: any) => {
      try {
        const { notificationId } = data;
        await notificationService.markAsRead(notificationId, socket.userId);
      } catch (error: any) {
        console.error("Error handling notification:read:", error);
        socket.emit("error", {
          message: "Failed to mark notification as read",
        });
      }
    });

    socket.on("disconnect", (reason: string) => {
      console.log(
        `User disconnected: ${socket.userId}, Socket ID: ${socket.id}, Reason: ${reason}`,
      );
      notificationService.unregisterUserSocket(socket.userId, socket.id);
    });

    socket.on("error", (error: Error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  console.log("Socket.IO server initialized");
  return io;
};

const getIO = (): Server | null => {
  return io;
};

export { initializeSocket, getIO };
