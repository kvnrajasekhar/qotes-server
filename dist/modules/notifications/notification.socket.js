"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initializeSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_io_1 = require("socket.io");
const notification_service_1 = __importDefault(
  require("./notification.service"),
);
const notification_constants_1 = require("./notification.constants");
let io = null;
const initializeSocket = (server) => {
  if (io) {
    console.warn("Socket.IO already initialized");
    return io;
  }
  io = new socket_io_1.Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3001",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    try {
      const decoded = jsonwebtoken_1.default.verify(
        token,
        process.env.JWT_SECRET || "",
      );
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}, Socket ID: ${socket.id}`);
    notification_service_1.default.registerUserSocket(socket.userId, socket.id);
    socket.emit(notification_constants_1.SOCKET_EVENTS.USER_REGISTERED, {
      userId: socket.userId,
      socketId: socket.id,
    });
    socket.on(notification_constants_1.SOCKET_EVENTS.REGISTER_USER, (data) => {
      if (data.userId === socket.userId) {
        notification_service_1.default.registerUserSocket(
          socket.userId,
          socket.id,
        );
      }
    });
    socket.on(
      notification_constants_1.SOCKET_EVENTS.NOTIFICATION_READ,
      async (data) => {
        try {
          const { notificationId } = data;
          await notification_service_1.default.markAsRead(
            notificationId,
            socket.userId,
          );
        } catch (error) {
          console.error("Error handling notification:read:", error);
          socket.emit("error", {
            message: "Failed to mark notification as read",
          });
        }
      },
    );
    socket.on("disconnect", (reason) => {
      console.log(
        `User disconnected: ${socket.userId}, Socket ID: ${socket.id}, Reason: ${reason}`,
      );
      notification_service_1.default.unregisterUserSocket(
        socket.userId,
        socket.id,
      );
    });
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });
  console.log("Socket.IO server initialized");
  return io;
};
exports.initializeSocket = initializeSocket;
const getIO = () => {
  return io;
};
exports.getIO = getIO;
//# sourceMappingURL=notification.socket.js.map
