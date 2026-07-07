"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const admin_service_1 = __importDefault(require("./admin.service"));
const router = express_1.default.Router();
router.get("/allusers", async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const users = await admin_service_1.default.getAllUsers({ cursor, limit });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Fetched all users successfully",
      users,
    );
  } catch (error) {
    return (0, responseFormatter_util_1.errorResponse)(
      res,
      500,
      "Failed to fetch users",
      error?.message,
    );
  }
});
router.get("/hiddenquotes", async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const quotes = await admin_service_1.default.getHiddenQuotes({
      cursor,
      limit,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Fetched hidden quotes successfully",
      quotes,
    );
  } catch (error) {
    return (0, responseFormatter_util_1.errorResponse)(
      res,
      500,
      "Failed to fetch hidden quotes",
      error?.message,
    );
  }
});
exports.default = router;
//# sourceMappingURL=admin.route.js.map
