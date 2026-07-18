"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_util_1 = __importDefault(require("../shared/utils/logger.util"));
let mongooseConnection = null;
const connectToDatabase = async () => {
    if (mongooseConnection) {
        return mongooseConnection;
    }
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI is not configured");
    }
    mongoose_1.default.set("strictQuery", false);
    mongoose_1.default.connection.on("connected", () => {
        logger_util_1.default.info("MongoDB connected", {
            service: "mongodb",
            readyState: mongoose_1.default.connection.readyState,
        });
    });
    mongoose_1.default.connection.on("disconnected", () => {
        logger_util_1.default.warn("MongoDB disconnected", {
            service: "mongodb",
            readyState: mongoose_1.default.connection.readyState,
        });
    });
    mongoose_1.default.connection.on("reconnected", () => {
        logger_util_1.default.info("MongoDB reconnected", {
            service: "mongodb",
            readyState: mongoose_1.default.connection.readyState,
        });
    });
    mongoose_1.default.connection.on("error", (error) => {
        logger_util_1.default.error("MongoDB connection error", {
            service: "mongodb",
            error,
        });
    });
    mongooseConnection = await mongoose_1.default.connect(mongoUri);
    logger_util_1.default.info("MongoDB connection established", {
        service: "mongodb",
        host: mongoUri,
    });
    return mongooseConnection;
};
exports.connectToDatabase = connectToDatabase;
//# sourceMappingURL=database.js.map