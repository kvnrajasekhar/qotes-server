import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";
import { AsyncLocalStorage } from "async_hooks";

const asyncLocalStorage = new AsyncLocalStorage<{ traceId?: string }>();

const getTraceId = (): string | undefined => {
  const context = asyncLocalStorage.getStore();
  return context?.traceId;
};

const withTraceId = (traceId: string, callback: () => void): void => {
  return asyncLocalStorage.run({ traceId }, callback);
};

const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(
    ({ timestamp, level, message, service, stack, ...meta }) => {
      const logObj: any = {
        timestamp,
        level,
        service: service || "unknown-service",
        message,
      };

      const traceId = getTraceId();
      if (traceId) {
        logObj.traceId = traceId;
      }

      if (stack) {
        logObj.stack = stack;
      }

      if (Object.keys(meta).length > 0) {
        logObj.metadata = meta;
      }

      return JSON.stringify(logObj);
    },
  ),
);

const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(
    ({ timestamp, level, message, service, stack, ...meta }) => {
      const traceId = getTraceId();
      const traceIdStr = traceId ? ` [${traceId}]` : "";
      const serviceStr = service ? ` [${service}]` : "";
      const stackStr = stack ? `\n${stack}` : "";
      const metaStr =
        Object.keys(meta).length > 0
          ? `\n${JSON.stringify(meta, null, 2)}`
          : "";

      return `${timestamp} ${level}${serviceStr}${traceIdStr}: ${message}${stackStr}${metaStr}`;
    },
  ),
);

const createLogger = (serviceName = "default-service"): winston.Logger => {
  const transports: winston.transport[] = [];

  const env = (process.env.NODE_ENV || "development").trim();
  const isProduction = env === "production";

  const enableFileLogging =
    (process.env.ENABLE_FILE_LOGGING || "").trim().toLowerCase() === "true" ||
    isProduction ||
    env === "development";

  console.log(
    `--- LOGGER DEBUG [${serviceName}]: NODE_ENV='${process.env.NODE_ENV}', ENABLE_FILE_LOGGING='${process.env.ENABLE_FILE_LOGGING}', Computed Flag=${enableFileLogging} ---`,
  );

  const logsDir = path.resolve(__dirname, "../../../logs");
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(path.join(logsDir, "errors"), { recursive: true });
  console.log(`--- FILESYSTEM TARGET PATH: '${logsDir}' ---`);

  transports.push(
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
      level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    }),
  );

  if (enableFileLogging) {
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "application-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
        zippedArchive: true,
        format: productionFormat,
        level: process.env.LOG_LEVEL || "info",
      }),
    );

    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "errors", "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
        zippedArchive: true,
        format: productionFormat,
        level: "error",
      }),
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    defaultMeta: { service: serviceName },
    transports,
    exceptionHandlers: [
      new winston.transports.Console({
        format: isProduction ? productionFormat : developmentFormat,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        format: isProduction ? productionFormat : developmentFormat,
      }),
    ],
  });
};

export { createLogger, getTraceId, withTraceId, asyncLocalStorage };
