"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotificationValidation = exports.createNotificationValidation = exports.markAsReadValidation = exports.getNotificationsValidation = void 0;
const notification_constants_1 = require("./notification.constants");
exports.getNotificationsValidation = {
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
                options: { min: 1, max: notification_constants_1.NOTIFICATION_CONFIG.MAX_PAGE_SIZE },
                errorMessage: `Limit must be between 1 and ${notification_constants_1.NOTIFICATION_CONFIG.MAX_PAGE_SIZE}`,
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
exports.markAsReadValidation = {
    params: {
        id: {
            isMongoId: {
                errorMessage: "Invalid notification ID",
            },
        },
    },
};
exports.createNotificationValidation = {
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
                options: [Object.values(notification_constants_1.NOTIFICATION_TYPES)],
                errorMessage: `Type must be one of: ${Object.values(notification_constants_1.NOTIFICATION_TYPES).join(", ")}`,
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
                options: { max: notification_constants_1.NOTIFICATION_CONFIG.MESSAGE_MAX_LENGTH },
                errorMessage: `Message must not exceed ${notification_constants_1.NOTIFICATION_CONFIG.MESSAGE_MAX_LENGTH} characters`,
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
                options: [Object.values(notification_constants_1.REFERENCE_TYPES)],
                errorMessage: `Reference type must be one of: ${Object.values(notification_constants_1.REFERENCE_TYPES).join(", ")}`,
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
exports.deleteNotificationValidation = {
    params: {
        id: {
            isMongoId: {
                errorMessage: "Invalid notification ID",
            },
        },
    },
};
//# sourceMappingURL=notification.validation.js.map