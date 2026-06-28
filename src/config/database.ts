import mongoose from "mongoose";
import logger from "../shared/utils/logger.util";

let mongooseConnection: typeof mongoose | null = null;

const connectToDatabase = async (): Promise<typeof mongoose> => {
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

  mongoose.connection.on("error", (error: Error) => {
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

export { connectToDatabase };
