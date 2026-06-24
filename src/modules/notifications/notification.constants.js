/**
 * Notification Module Constants
 * Defines notification types, reference types, and configuration values
 */

/**
 * Notification type enum
 * All supported notification types in the system
 */
const NOTIFICATION_TYPES = {
  LIKE_QUOTE: "LIKE_QUOTE",
  COMMENT_QUOTE: "COMMENT_QUOTE",
  REPLY_COMMENT: "REPLY_COMMENT",
  FOLLOW_USER: "FOLLOW_USER",
  MENTION_USER: "MENTION_USER",
  REQUOTE_QUOTE: "REQUOTE_QUOTE",
  SYSTEM: "SYSTEM",
};

/**
 * Reference type enum
 * Types of content that can be referenced in notifications
 */
const REFERENCE_TYPES = {
  QUOTE: "Quote",
  COMMENT: "Comment",
  USER: "User",
  SYSTEM: "System",
};

/**
 * Socket.IO event names
 * Events used for real-time notification delivery
 */
const SOCKET_EVENTS = {
  // Server to client events
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_COUNT: "notification:count",
  USER_REGISTERED: "user:registered",

  // Client to server events
  NOTIFICATION_READ: "notification:read",
  REGISTER_USER: "register:user",
};

/**
 * Notification configuration
 * Default values and limits
 */
const NOTIFICATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
  MESSAGE_MAX_LENGTH: 200,
  TTL_DAYS: 90,
  BATCH_INTERVAL_MS: 5000,
};

/**
 * Notification message templates
 * Templates for generating notification messages
 */
const MESSAGE_TEMPLATES = {
  [NOTIFICATION_TYPES.LIKE_QUOTE]: "{{senderName}} liked your quote",
  [NOTIFICATION_TYPES.COMMENT_QUOTE]: "{{senderName}} commented on your quote",
  [NOTIFICATION_TYPES.REPLY_COMMENT]: "{{senderName}} replied to your comment",
  [NOTIFICATION_TYPES.FOLLOW_USER]: "{{senderName}} started following you",
  [NOTIFICATION_TYPES.MENTION_USER]: "{{senderName}} mentioned you",
  [NOTIFICATION_TYPES.REQUOTE_QUOTE]: "{{senderName}} requoted your quote",
  [NOTIFICATION_TYPES.SYSTEM]: "{{message}}",
};

module.exports = {
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
  SOCKET_EVENTS,
  NOTIFICATION_CONFIG,
  MESSAGE_TEMPLATES,
};
