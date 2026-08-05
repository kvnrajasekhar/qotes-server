import {
  createLogger,
  getTraceId,
  withTraceId,
  asyncLocalStorage,
} from "./logger";

export { createLogger, getTraceId, withTraceId, asyncLocalStorage };

export { default as loggerFactory } from "./loggerFactory";
export { default as getServiceLogger } from "./loggerFactory";
