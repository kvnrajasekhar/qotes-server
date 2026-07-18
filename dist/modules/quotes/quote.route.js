"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const auth_middleware_1 = __importDefault(require("../../shared/middlewares/auth.middleware"));
const quote_service_1 = __importDefault(require("./quote.service"));
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const router = express_1.default.Router();
router.post("/", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    console.log("DEBUG: Keys in req.user:", Object.keys(req.user));
    console.log("DEBUG: Value of req.user.id:", req.user.id);
    console.log("DEBUG: Value of req.user._id:", req.user._id);
    const { text, author, category, hashtags, taggedUsers, isRequote = false, parentQuoteId = null, isHiddenBySystem = false, } = req.body;
    if (!isRequote && !text) {
        return (0, responseFormatter_util_1.errorResponse)(res, 400, "Quote text is required");
    }
    if (isRequote && !parentQuoteId) {
        return (0, responseFormatter_util_1.errorResponse)(res, 400, "Parent quote ID is required for requote");
    }
    const newQuote = await quote_service_1.default.createQuote({
        text: text || "",
        author,
        category: category || "",
        hashtags: hashtags || [],
        taggedUsers: taggedUsers || [],
        creator: req.user.userId,
        isRequote,
        parentQuoteId,
        isHiddenBySystem,
    });
    if (!newQuote) {
        return (0, responseFormatter_util_1.errorResponse)(res, 500, "Failed to create quote");
    }
    return (0, responseFormatter_util_1.successResponse)(res, 201, isRequote ? "Requote created successfully" : "Quote created successfully", newQuote);
}));
router.get("/:id", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    const quoteId = req.params.id;
    const quote = await quote_service_1.default.getQuoteById(quoteId);
    if (!quote) {
        return (0, responseFormatter_util_1.errorResponse)(res, 404, "Quote not found");
    }
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Quote retrieved successfully", quote);
}));
router.get("/", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    const quotes = quote_service_1.default.getAllQuotes();
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Quotes retrieved successfully", quotes);
}));
router.patch("/:id", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    const quoteId = req.params.id;
    const updateData = req.body;
    const updatedQuote = quote_service_1.default.updateQuote(quoteId, updateData);
    if (!updatedQuote) {
        return (0, responseFormatter_util_1.errorResponse)(res, 404, "Quote not found or update failed");
    }
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Quote updated successfully", updatedQuote);
}));
router.delete("/:id", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    const quoteId = req.params.id;
    const deletedQuote = quote_service_1.default.deleteQuote(quoteId);
    if (!deletedQuote) {
        return (0, responseFormatter_util_1.errorResponse)(res, 404, "Quote not found or deletion failed");
    }
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Quote deleted successfully", deletedQuote);
}));
router.get("/me", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const { cursor, limit } = req.query;
    const userQuotes = quote_service_1.default.getQuotesByUser(userId, cursor, limit);
    if (!userQuotes) {
        return (0, responseFormatter_util_1.errorResponse)(res, 404, "No quotes found for this user");
    }
    return (0, responseFormatter_util_1.successResponse)(res, 200, "User quotes retrieved successfully", userQuotes);
}));
exports.default = router;
//# sourceMappingURL=quote.route.js.map