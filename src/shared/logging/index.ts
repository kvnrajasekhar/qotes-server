import {
  createLogger,
  getTraceId,
  withTraceId,
  asyncLocalStorage,
} from "./logger";
import getServiceLogger from "./loggerFactory";

export { createLogger, getTraceId, withTraceId, asyncLocalStorage };

export { default as loggerFactory } from "./loggerFactory";
export { default as getServiceLogger } from "./loggerFactory";
