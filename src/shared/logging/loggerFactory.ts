import winston from "winston";
import { createLogger } from "./logger";

const getServiceLogger = (serviceName: string): winston.Logger => {
  if (!serviceName || typeof serviceName !== "string") {
    throw new Error("serviceName must be a non-empty string");
  }
  return createLogger(serviceName);
};

export default getServiceLogger;
