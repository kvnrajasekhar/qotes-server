const Comment = require("../../models/comment.model");
const Quote = require("../../models/quote.model");
const User = require("../../models/user.model");
const notificationService = require("../notifications/notification.service");
const {
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
} = require("../notifications/notification.constants");

const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === "true";

const commentService = {
  addComment: async ({ quoteId, userId, text, parentCommentId = null }) => {
    const comment = await Comment.create({
      quote: quoteId,
      author: userId,
      text,
      parentComment: parentCommentId,
    });

    // Increment reply count if this is a reply
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $inc: { repliesCount: 1 },
      });

      // Notify original comment author about reply
      if (NOTIFICATIONS_ENABLED) {
        process.nextTick(async () => {
          try {
            const parentComment =
              await Comment.findById(parentCommentId).lean();
            const author = await User.findById(userId).lean();

            if (
              parentComment &&
              author &&
              parentComment.author.toString() !== userId
            ) {
              await notificationService.createNotification({
                recipient: parentComment.author,
                sender: userId,
                type: NOTIFICATION_TYPES.REPLY_COMMENT,
                message: `${author.username || "Someone"} replied to your comment`,
                referenceId: comment._id,
                referenceType: REFERENCE_TYPES.COMMENT,
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
      // Root comment → increment quote comment count
      await Quote.findByIdAndUpdate(quoteId, {
        $inc: { commentsCount: 1 },
      });

      // Notify quote creator about comment
      if (NOTIFICATIONS_ENABLED) {
        process.nextTick(async () => {
          try {
            const quote = await Quote.findById(quoteId)
              .select("creator text author")
              .lean();
            const author = await User.findById(userId).lean();

            if (quote && author && quote.creator.toString() !== userId) {
              await notificationService.createNotification({
                recipient: quote.creator,
                sender: userId,
                type: NOTIFICATION_TYPES.COMMENT_QUOTE,
                message: `${author.username || "Someone"} commented on your quote`,
                referenceId: comment._id,
                referenceType: REFERENCE_TYPES.COMMENT,
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

    const comment = await Comment.findOneAndUpdate(
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

    const replies = await Comment.find(query)
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
    const comment = await Comment.findOneAndUpdate(
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
    const comment = await Comment.findById(commentId).select("likes");

    if (!comment) throw new Error("Comment not found");

    const hasLiked = comment.likes.includes(userId);

    await Comment.findByIdAndUpdate(commentId, {
      [hasLiked ? "$pull" : "$addToSet"]: { likes: userId },
    });

    return {
      liked: !hasLiked,
    };
  },
};

module.exports = commentService;
