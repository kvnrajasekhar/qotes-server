"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_async_handler_1 = __importDefault(
  require("express-async-handler"),
);
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const search_service_1 = __importDefault(require("./search.service"));
const router = (0, express_1.Router)();
router.get(
  "/users",
  (0, express_async_handler_1.default)(async (req, res) => {
    const query = req.query.q || "";
    const { cursor, limit } = req.query;
    const users = await search_service_1.default.searchUsers({
      query,
      cursor,
      limit,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "User search completed successfully",
      users,
    );
  }),
);
router.get(
  "/global",
  (0, express_async_handler_1.default)(async (req, res) => {
    const query = req.query.q || "";
    const type = req.query.type || "all";
    const limit = parseInt(req.query.limit, 10) || 20;
    const cursor = req.query.cursor || null;
    const results = await search_service_1.default.searchGlobal({
      query,
      type,
      limit,
      cursor,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Global search completed successfully",
      results,
    );
  }),
);
exports.default = router;
//# sourceMappingURL=search.route.js.map
