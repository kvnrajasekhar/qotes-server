/**
 * Notification Validation Schemas
 * Validation rules for notification-related requests
 */

const {
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
  NOTIFICATION_CONFIG,
} = require("./notification.constants");

/**
 * Validates notification query parameters for GET /api/notifications
 */
const getNotificationsValidation = {
  query: {
    page: {
      optional: true,
      isInt: {
        options: { min: 1 },
        errorMessage: "Page must be a positive integer",
      },
      toInt: true,
    },
    limit: {
      optional: true,
      isInt: {
        options: { min: 1, max: NOTIFICATION_CONFIG.MAX_PAGE_SIZE },
        errorMessage: `Limit must be between 1 and ${NOTIFICATION_CONFIG.MAX_PAGE_SIZE}`,
      },
      toInt: true,
    },
    unreadOnly: {
      optional: true,
      isBoolean: {
        errorMessage: "unreadOnly must be a boolean",
      },
      toBoolean: true,
    },
  },
};

/**
 * Validates notification ID parameter for PATCH /api/notifications/:id/read
 */
const markAsReadValidation = {
  params: {
    id: {
      isMongoId: {
        errorMessage: "Invalid notification ID",
      },
    },
  },
};

/**
 * Validates notification creation data (internal use)
 */
const createNotificationValidation = {
  body: {
    recipient: {
      isMongoId: {
        errorMessage: "Invalid recipient ID",
      },
      notEmpty: {
        errorMessage: "Recipient is required",
      },
    },
    sender: {
      isMongoId: {
        errorMessage: "Invalid sender ID",
      },
      notEmpty: {
        errorMessage: "Sender is required",
      },
    },
    type: {
      isIn: {
        options: [Object.values(NOTIFICATION_TYPES)],
        errorMessage: `Type must be one of: ${Object.values(NOTIFICATION_TYPES).join(", ")}`,
      },
      notEmpty: {
        errorMessage: "Type is required",
      },
    },
    message: {
      isString: {
        errorMessage: "Message must be a string",
      },
      isLength: {
        options: { max: NOTIFICATION_CONFIG.MESSAGE_MAX_LENGTH },
        errorMessage: `Message must not exceed ${NOTIFICATION_CONFIG.MESSAGE_MAX_LENGTH} characters`,
      },
      notEmpty: {
        errorMessage: "Message is required",
      },
    },
    referenceId: {
      optional: true,
      isMongoId: {
        errorMessage: "Invalid reference ID",
      },
    },
    referenceType: {
      optional: true,
      isIn: {
        options: [Object.values(REFERENCE_TYPES)],
        errorMessage: `Reference type must be one of: ${Object.values(REFERENCE_TYPES).join(", ")}`,
      },
    },
    metadata: {
      optional: true,
      isObject: {
        errorMessage: "Metadata must be an object",
      },
    },
  },
};

/**
 * Validates notification ID parameter for DELETE /api/notifications/:id
 */
const deleteNotificationValidation = {
  params: {
    id: {
      isMongoId: {
        errorMessage: "Invalid notification ID",
      },
    },
  },
};

module.exports = {
  getNotificationsValidation,
  markAsReadValidation,
  createNotificationValidation,
  deleteNotificationValidation,
};
