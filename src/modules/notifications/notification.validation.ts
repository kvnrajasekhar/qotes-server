import {
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
  NOTIFICATION_CONFIG,
} from "./notification.constants";

export const getNotificationsValidation = {
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

export const markAsReadValidation = {
  params: {
    id: {
      isMongoId: {
        errorMessage: "Invalid notification ID",
      },
    },
  },
};

export const createNotificationValidation = {
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

export const deleteNotificationValidation = {
  params: {
    id: {
      isMongoId: {
        errorMessage: "Invalid notification ID",
      },
    },
  },
};
