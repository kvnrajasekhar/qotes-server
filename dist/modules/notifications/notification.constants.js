"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_TEMPLATES =
  exports.NOTIFICATION_CONFIG =
  exports.SOCKET_EVENTS =
  exports.REFERENCE_TYPES =
  exports.NOTIFICATION_TYPES =
    void 0;
exports.NOTIFICATION_TYPES = {
  LIKE_QUOTE: "LIKE_QUOTE",
  COMMENT_QUOTE: "COMMENT_QUOTE",
  REPLY_COMMENT: "REPLY_COMMENT",
  FOLLOW_USER: "FOLLOW_USER",
  MENTION_USER: "MENTION_USER",
  REQUOTE_QUOTE: "REQUOTE_QUOTE",
  SYSTEM: "SYSTEM",
};
exports.REFERENCE_TYPES = {
  QUOTE: "Quote",
  COMMENT: "Comment",
  USER: "User",
  SYSTEM: "System",
};
exports.SOCKET_EVENTS = {
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_COUNT: "notification:count",
  USER_REGISTERED: "user:registered",
  NOTIFICATION_READ: "notification:read",
  REGISTER_USER: "register:user",
};
exports.NOTIFICATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
  MESSAGE_MAX_LENGTH: 200,
  TTL_DAYS: 90,
  BATCH_INTERVAL_MS: 5000,
};
exports.MESSAGE_TEMPLATES = {
  [exports.NOTIFICATION_TYPES.LIKE_QUOTE]: "{{senderName}} liked your quote",
  [exports.NOTIFICATION_TYPES.COMMENT_QUOTE]:
    "{{senderName}} commented on your quote",
  [exports.NOTIFICATION_TYPES.REPLY_COMMENT]:
    "{{senderName}} replied to your comment",
  [exports.NOTIFICATION_TYPES.FOLLOW_USER]:
    "{{senderName}} started following you",
  [exports.NOTIFICATION_TYPES.MENTION_USER]: "{{senderName}} mentioned you",
  [exports.NOTIFICATION_TYPES.REQUOTE_QUOTE]:
    "{{senderName}} requoted your quote",
  [exports.NOTIFICATION_TYPES.SYSTEM]: "{{message}}",
};
//# sourceMappingURL=notification.constants.js.map
