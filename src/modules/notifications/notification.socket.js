const jwt = require("jsonwebtoken");
const notificationService = require("./notification.service");
const { SOCKET_EVENTS } = require("./notification.constants");

let io = null;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
const initializeSocket = (server) => {
  if (io) {
    console.warn("Socket.IO already initialized");
    return io;
  }

  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3001",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}, Socket ID: ${socket.id}`);

    // Register user socket
    notificationService.registerUserSocket(socket.userId, socket.id);

    // Emit registration confirmation
    socket.emit(SOCKET_EVENTS.USER_REGISTERED, {
      userId: socket.userId,
      socketId: socket.id,
    });

    // Handle user registration event (redundant but useful for reconnection)
    socket.on(SOCKET_EVENTS.REGISTER_USER, (data) => {
      if (data.userId === socket.userId) {
        notificationService.registerUserSocket(socket.userId, socket.id);
      }
    });

    // Handle notification read event
    socket.on(SOCKET_EVENTS.NOTIFICATION_READ, async (data) => {
      try {
        const { notificationId } = data;
        await notificationService.markAsRead(notificationId, socket.userId);
      } catch (error) {
        console.error("Error handling notification:read:", error);
        socket.emit("error", {
          message: "Failed to mark notification as read",
        });
      }
    });

    // Disconnect handler
    socket.on("disconnect", (reason) => {
      console.log(
        `User disconnected: ${socket.userId}, Socket ID: ${socket.id}, Reason: ${reason}`,
      );
      notificationService.unregisterUserSocket(socket.userId, socket.id);
    });

    // Error handler
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  console.log("Socket.IO server initialized");
  return io;
};

/**
 * Get Socket.IO instance
 * @returns {Object|null} Socket.IO instance or null if not initialized
 */
const getIO = () => {
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};
