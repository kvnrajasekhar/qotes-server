const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const {
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
} = require("../modules/notifications/notification.constants");

/**
 * Notification Schema
 * Represents a notification in the system
 */
const NotificationSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(NOTIFICATION_TYPES),
      index: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 200,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    referenceType: {
      type: String,
      enum: Object.values(REFERENCE_TYPES),
      index: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Single indexes for common queries
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ sender: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ referenceId: 1 });
NotificationSchema.index({ referenceType: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ isDeleted: 1 });
NotificationSchema.index({ createdAt: 1 });

// Compound indexes for optimized queries
NotificationSchema.index({ recipient: 1, createdAt: -1 }); // User's notifications in chronological order
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 }); // Unread notifications
NotificationSchema.index({ recipient: 1, isDeleted: 1, createdAt: -1 }); // Exclude deleted notifications

// TTL index for automatic cleanup (90 days)
// Commented out by default - enable if needed
// NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days in seconds

// Pre-save middleware to update updatedAt
NotificationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Pre-update middleware to update updatedAt
NotificationSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
