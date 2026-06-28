import {
  createLogger,
  getTraceId,
  withTraceId,
  asyncLocalStorage,
} from "./logger";
import getServiceLogger from "./loggerFactory";

export {
  createLogger,
  loggerFactory as getServiceLogger,
  getTraceId,
  withTraceId,
  asyncLocalStorage,
};
