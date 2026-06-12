const mongoose = require("mongoose");
const logger = require("../shared/utils/logger.util");

let mongooseConnection;

const connectToDatabase = async () => {
  if (mongooseConnection) {
    return mongooseConnection;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  mongoose.set("strictQuery", false);

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected", {
      service: "mongodb",
      readyState: mongoose.connection.readyState,
    });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected", {
      service: "mongodb",
      readyState: mongoose.connection.readyState,
    });
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected", {
      service: "mongodb",
      readyState: mongoose.connection.readyState,
    });
  });

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", {
      service: "mongodb",
      error,
    });
  });

  mongooseConnection = await mongoose.connect(mongoUri);
  logger.info("MongoDB connection established", {
    service: "mongodb",
    host: mongoUri,
  });
  return mongooseConnection;
};

module.exports = { connectToDatabase };
