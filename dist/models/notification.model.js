"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
const { NOTIFICATION_TYPES, REFERENCE_TYPES, } = require("../modules/notifications/notification.constants");
const NotificationSchema = new Schema({
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
}, {
    timestamps: true,
});
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ sender: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ referenceId: 1 });
NotificationSchema.index({ referenceType: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ isDeleted: 1 });
NotificationSchema.index({ createdAt: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isDeleted: 1, createdAt: -1 });
NotificationSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});
NotificationSchema.pre("findOneAndUpdate", function (next) {
    this.set({ updatedAt: new Date() });
    next();
});
const Notification = mongoose_1.default.model("Notification", NotificationSchema);
exports.default = Notification;
//# sourceMappingURL=notification.model.js.map