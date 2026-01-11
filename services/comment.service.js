const Comment = require('../models/comment.model');
const Quote = require('../models/quote.model');
const commentService = {

    addComment: async ({ quoteId, userId, text, parentCommentId = null }) => {

        const comment = await Comment.create({
            quote: quoteId,
            author: userId,
            text,
            parentComment: parentCommentId
        });

        // Increment reply count if this is a reply
        if (parentCommentId) {
            await Comment.findByIdAndUpdate(parentCommentId, {
                $inc: { repliesCount: 1 }
            });
        } else {
            // Root comment → increment quote comment count
            await Quote.findByIdAndUpdate(quoteId, {
                $inc: { commentsCount: 1 }
            });
        }

        return comment;
    },
    editComment: async ({ commentId, userId, text }) => {
        if (!text || !text.trim()) {
            throw new Error('Comment text cannot be empty');
        }

        const comment = await Comment.findOneAndUpdate(
            { _id: commentId, author: userId },
            {
                text,
                isEdited: true,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!comment) {
            throw new Error('Comment not found or unauthorized');
        }

        return comment;
    },
    getComments: async ({ quoteId, parentCommentId, cursor = null, limit = 10 }) => {
        const query = {
            quote: quoteId,
            parentComment: parentCommentId
        };

        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        const replies = await Comment.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate('author', 'username avatar')
            .lean();

        const hasMore = replies.length > limit;
        if (hasMore) replies.pop();

        return {
            replies,
            pagination: {
                nextCursor: hasMore
                    ? replies[replies.length - 1].createdAt
                    : null,
                hasMore
            }
        };
    },
    deleteComment: async ({ commentId, userId }) => {
        const comment = await Comment.findOneAndUpdate(
            { _id: commentId, author: userId },
            {
                isDeleted: true,
                text: '[deleted]',
                deletedAt: new Date()
            },
            { new: true }
        );

        if (!comment) {
            throw new Error('Comment not found or unauthorized');
        }

        return comment;
    },
    toggleLike: async ({ commentId, userId }) => {
        const comment = await Comment.findById(commentId).select('likes');

        if (!comment) throw new Error('Comment not found');

        const hasLiked = comment.likes.includes(userId);

        await Comment.findByIdAndUpdate(commentId, {
            [hasLiked ? '$pull' : '$addToSet']: { likes: userId }
        });

        return {
            liked: !hasLiked
        };
    },

};

module.exports = commentService;