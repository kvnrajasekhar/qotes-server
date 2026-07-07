"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const comment_model_1 = __importDefault(require("../../models/comment.model"));
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const notification_service_1 = __importDefault(
  require("../notifications/notification.service"),
);
const notification_constants_1 = require("../notifications/notification.constants");
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === "true";
const commentService = {
  addComment: async ({ quoteId, userId, text, parentCommentId = null }) => {
    const comment = await comment_model_1.default.create({
      quote: quoteId,
      author: userId,
      text,
      parentComment: parentCommentId,
    });
    if (parentCommentId) {
      await comment_model_1.default.findByIdAndUpdate(parentCommentId, {
        $inc: { repliesCount: 1 },
      });
      if (NOTIFICATIONS_ENABLED) {
        process.nextTick(async () => {
          try {
            const parentComment = await comment_model_1.default
              .findById(parentCommentId)
              .lean();
            const author = await user_model_1.default.findById(userId).lean();
            if (
              parentComment &&
              author &&
              parentComment.author.toString() !== userId
            ) {
              await notification_service_1.default.createNotification({
                recipient: parentComment.author,
                sender: userId,
                type: notification_constants_1.NOTIFICATION_TYPES.REPLY_COMMENT,
                message: `${author.username || "Someone"} replied to your comment`,
                referenceId: comment._id,
                referenceType: notification_constants_1.REFERENCE_TYPES.COMMENT,
                metadata: {
                  quoteId,
                  parentCommentId,
                  replyText: text,
                  senderName: author.username,
                },
              });
            }
          } catch (error) {
            console.error("Failed to create reply notification:", error);
          }
        });
      }
    } else {
      await quote_model_1.default.findByIdAndUpdate(quoteId, {
        $inc: { commentsCount: 1 },
      });
      if (NOTIFICATIONS_ENABLED) {
        process.nextTick(async () => {
          try {
            const quote = await quote_model_1.default
              .findById(quoteId)
              .select("creator text author")
              .lean();
            const author = await user_model_1.default.findById(userId).lean();
            if (quote && author && quote.creator.toString() !== userId) {
              await notification_service_1.default.createNotification({
                recipient: quote.creator,
                sender: userId,
                type: notification_constants_1.NOTIFICATION_TYPES.COMMENT_QUOTE,
                message: `${author.username || "Someone"} commented on your quote`,
                referenceId: comment._id,
                referenceType: notification_constants_1.REFERENCE_TYPES.COMMENT,
                metadata: {
                  quoteId,
                  commentText: text,
                  quoteText: quote.text,
                  quoteAuthor: quote.author,
                  senderName: author.username,
                },
              });
            }
          } catch (error) {
            console.error("Failed to create comment notification:", error);
          }
        });
      }
    }
    return comment;
  },
  editComment: async ({ commentId, userId, text }) => {
    if (!text || !text.trim()) {
      throw new Error("Comment text cannot be empty");
    }
    const comment = await comment_model_1.default.findOneAndUpdate(
      { _id: commentId, author: userId },
      {
        text,
        isEdited: true,
        updatedAt: new Date(),
      },
      { new: true },
    );
    if (!comment) {
      throw new Error("Comment not found or unauthorized");
    }
    return comment;
  },
  getComments: async ({
    quoteId,
    parentCommentId,
    cursor = null,
    limit = 10,
  }) => {
    const query = {
      quote: quoteId,
      parentComment: parentCommentId,
    };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }
    const replies = await comment_model_1.default
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate("author", "username avatar")
      .lean();
    const hasMore = replies.length > limit;
    if (hasMore) replies.pop();
    return {
      replies,
      pagination: {
        nextCursor: hasMore ? replies[replies.length - 1].createdAt : null,
        hasMore,
      },
    };
  },
  deleteComment: async ({ commentId, userId }) => {
    const comment = await comment_model_1.default.findOneAndUpdate(
      { _id: commentId, author: userId },
      {
        isDeleted: true,
        text: "[deleted]",
        deletedAt: new Date(),
      },
      { new: true },
    );
    if (!comment) {
      throw new Error("Comment not found or unauthorized");
    }
    return comment;
  },
  toggleLike: async ({ commentId, userId }) => {
    const comment = await comment_model_1.default
      .findById(commentId)
      .select("likes");
    if (!comment) throw new Error("Comment not found");
    const hasLiked = comment.likes.includes(userId);
    await comment_model_1.default.findByIdAndUpdate(commentId, {
      [hasLiked ? "$pull" : "$addToSet"]: { likes: userId },
    });
    return {
      liked: !hasLiked,
    };
  },
};
exports.default = commentService;
//# sourceMappingURL=comment.service.js.map
