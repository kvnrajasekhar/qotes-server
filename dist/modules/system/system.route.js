"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const router = express_1.default.Router();
const AVAILABLE_ROUTES = [
  {
    method: "GET",
    path: "/",
    description: "API is running status check",
    authenticated: false,
  },
  {
    method: "GET",
    path: "/health",
    description: "Service health check",
    authenticated: false,
  },
  {
    method: "GET",
    path: "/ready",
    description: "Service readiness check (dependencies status)",
    authenticated: false,
  },
  {
    method: "GET",
    path: "/metrics",
    description: "Prometheus metrics endpoint",
    authenticated: false,
  },
  {
    method: "GET",
    path: "/v1/admin/allusers",
    description: "Get all users with pagination",
    authenticated: true,
    query: { cursor: "optional", limit: "optional" },
  },
  {
    method: "GET",
    path: "/v1/admin/hiddenquotes",
    description: "Get all hidden/system quotes",
    authenticated: true,
    query: { cursor: "optional", limit: "optional" },
  },
  {
    method: "POST",
    path: "/v1/auth/register",
    description: "User registration",
    authenticated: false,
    body: {
      email: "string (required)",
      password: "string (required)",
      username: "string (required)",
    },
  },
  {
    method: "POST",
    path: "/v1/auth/login",
    description: "User login",
    authenticated: false,
    body: { email: "string (required)", password: "string (required)" },
  },
  {
    method: "POST",
    path: "/v1/auth/forgot-password",
    description: "Initiate password reset",
    authenticated: false,
    body: { email: "string (required)" },
  },
  {
    method: "POST",
    path: "/v1/auth/reset-password",
    description: "Complete password reset",
    authenticated: false,
    body: {
      token: "string (required)",
      newPassword: "string (required)",
    },
  },
  {
    method: "GET",
    path: "/v1/quote/all",
    description: "Get all quotes",
    authenticated: false,
    query: { limit: "optional", cursor: "optional" },
  },
  {
    method: "POST",
    path: "/v1/quote/create",
    description: "Create a new quote",
    authenticated: true,
    body: {
      text: "string (required)",
      author: "string (optional)",
      category: "string (optional)",
      hashtags: "array (optional)",
    },
  },
  {
    method: "GET",
    path: "/v1/quote/:id",
    description: "Get quote by ID",
    authenticated: false,
    params: { id: "ObjectId (required)" },
  },
  {
    method: "PATCH",
    path: "/v1/quote/:id",
    description: "Update quote",
    authenticated: true,
    params: { id: "ObjectId (required)" },
  },
  {
    method: "DELETE",
    path: "/v1/quote/:id",
    description: "Delete quote",
    authenticated: true,
    params: { id: "ObjectId (required)" },
  },
  {
    method: "GET",
    path: "/v1/user/profile/:username",
    description: "Get user profile by username",
    authenticated: false,
    params: { username: "string (required)" },
  },
  {
    method: "GET",
    path: "/v1/user/me",
    description: "Get current user profile",
    authenticated: true,
  },
  {
    method: "PATCH",
    path: "/v1/user/profile",
    description: "Update user profile",
    authenticated: true,
    body: {
      firstName: "string (optional)",
      lastName: "string (optional)",
      bio: "string (optional)",
    },
  },
  {
    method: "POST",
    path: "/v1/user/avatar",
    description: "Upload user avatar",
    authenticated: true,
    body: { file: "FormData file (required)" },
  },
  {
    method: "GET",
    path: "/v1/user/suggested",
    description: "Get suggested users to follow",
    authenticated: false,
    query: { limit: "optional" },
  },
  {
    method: "GET",
    path: "/v1/user/:userId/requotes",
    description: "Get user's requotes",
    authenticated: false,
    params: { userId: "ObjectId (required)" },
    query: { limit: "optional", cursor: "optional" },
  },
  {
    method: "GET",
    path: "/v1/user/:userId/followers",
    description: "Get user's followers",
    authenticated: false,
    params: { userId: "ObjectId (required)" },
    query: { limit: "optional", cursor: "optional" },
  },
  {
    method: "POST",
    path: "/v1/user/follow/:targetId",
    description: "Follow/unfollow user",
    authenticated: true,
    params: { targetId: "ObjectId (required)" },
  },
  {
    method: "POST",
    path: "/v1/reaction/toggle",
    description: "Toggle reaction (like/celebrate/sad) on quote",
    authenticated: true,
    body: {
      quoteId: "ObjectId (required)",
      type: "string - like|celebrate|sad (required)",
    },
  },
  {
    method: "GET",
    path: "/v1/reaction/:quoteId",
    description: "Get reactions for a quote",
    authenticated: false,
    params: { quoteId: "ObjectId (required)" },
    query: { limit: "optional", cursor: "optional", type: "optional" },
  },
  {
    method: "POST",
    path: "/v1/collections",
    description: "Create a collection",
    authenticated: true,
    body: {
      name: "string (required)",
      description: "string (optional)",
    },
  },
  {
    method: "GET",
    path: "/v1/collections",
    description: "Get user's collections",
    authenticated: true,
  },
  {
    method: "GET",
    path: "/v1/collections/:id",
    description: "Get collection details",
    authenticated: false,
    params: { id: "ObjectId (required)" },
  },
  {
    method: "PATCH",
    path: "/v1/collections/:id",
    description: "Update collection",
    authenticated: true,
    params: { id: "ObjectId (required)" },
  },
  {
    method: "DELETE",
    path: "/v1/collections/:id",
    description: "Delete collection",
    authenticated: true,
    params: { id: "ObjectId (required)" },
  },
  {
    method: "POST",
    path: "/v1/collections/:id/add",
    description: "Add quote to collection",
    authenticated: true,
    params: { id: "ObjectId (required)" },
    body: { quoteId: "ObjectId (required)" },
  },
  {
    method: "POST",
    path: "/v1/collections/:id/remove",
    description: "Remove quote from collection",
    authenticated: true,
    params: { id: "ObjectId (required)" },
    body: { quoteId: "ObjectId (required)" },
  },
  {
    method: "GET",
    path: "/v1/comment/:quoteId",
    description: "Get comments on a quote",
    authenticated: false,
    params: { quoteId: "ObjectId (required)" },
    query: { limit: "optional", cursor: "optional" },
  },
  {
    method: "POST",
    path: "/v1/comment",
    description: "Add comment to quote",
    authenticated: true,
    body: {
      quoteId: "ObjectId (required)",
      text: "string (required)",
    },
  },
  {
    method: "PATCH",
    path: "/v1/comment/:id",
    description: "Update comment",
    authenticated: true,
    params: { id: "ObjectId (required)" },
    body: { text: "string (required)" },
  },
  {
    method: "DELETE",
    path: "/v1/comment/:id",
    description: "Delete comment",
    authenticated: true,
    params: { id: "ObjectId (required)" },
  },
  {
    method: "GET",
    path: "/v1/feed",
    description: "Get personalized feed",
    authenticated: true,
    query: { limit: "optional", cursor: "optional" },
  },
  {
    method: "POST",
    path: "/v1/safety/report",
    description: "Report content (quote/comment/user)",
    authenticated: true,
    body: {
      contentType: "string - quote|comment|user (required)",
      contentId: "ObjectId (required)",
      reason: "string (required)",
    },
  },
  {
    method: "GET",
    path: "/v1/safety/stats",
    description: "Get report statistics",
    authenticated: true,
  },
  {
    method: "GET",
    path: "/v1/search",
    description: "Search quotes and users",
    authenticated: false,
    query: {
      q: "string (required)",
      type: "string - quote|user|all (optional)",
      limit: "optional",
      cursor: "optional",
    },
  },
  {
    method: "GET",
    path: "/v1/preference",
    description: "Get user content preferences",
    authenticated: true,
  },
  {
    method: "PATCH",
    path: "/v1/preference",
    description: "Update user content preferences",
    authenticated: true,
    body: { blockedCategories: "array (optional)" },
  },
  {
    method: "GET",
    path: "/v1/system/routes",
    description: "Get all available API routes (requires API key)",
    authenticated: "api-key",
    header: { "X-API-Key": "string (required)" },
  },
];
router.get("/test", (req, res) => {
  return (0, responseFormatter_util_1.successResponse)(
    res,
    200,
    "System router is working!",
    {
      API_KEY_SECRET: process.env.API_KEY_SECRET ? "✓ Set" : "✗ Not set",
      timestamp: new Date().toISOString(),
    },
  );
});
router.get("/routes", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY_SECRET) {
    return (0, responseFormatter_util_1.errorResponse)(
      res,
      403,
      "Invalid or missing API key",
    );
  }
  return (0, responseFormatter_util_1.successResponse)(
    res,
    200,
    "Available API routes",
    {
      total: AVAILABLE_ROUTES.length,
      routes: AVAILABLE_ROUTES.sort((a, b) => a.path.localeCompare(b.path)),
    },
  );
});
router.get("/health", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY_SECRET) {
    return (0, responseFormatter_util_1.errorResponse)(
      res,
      403,
      "Invalid or missing API key",
    );
  }
  const healthStatus = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    features: {
      imageGeneration:
        process.env.IMAGE_GENERATION_ENABLED === "true"
          ? "enabled"
          : "disabled",
      notifications:
        process.env.NOTIFICATIONS_ENABLED === "true" ? "enabled" : "disabled",
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      unit: "MB",
    },
  };
  return (0, responseFormatter_util_1.successResponse)(
    res,
    200,
    "System health",
    healthStatus,
  );
});
exports.default = router;
//# sourceMappingURL=system.route.js.map
