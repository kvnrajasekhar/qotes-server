const router = require('express').Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middlewares/auth.middleware');
const { successResponse, errorResponse } = require('../utils/responseFormatter.util');
const commentService = require('../services/comment.service');

router.post('/:quoteId', authMiddleware, asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { quoteId } = req.params;
        const { text, parentCommentId } = req.body;

        if (!text) {
            return errorResponse(res, 400, 'Comment text is required');
        }

        const comment = await commentService.addComment({
            quoteId,
            userId,
            text,
            parentCommentId
        });

        return successResponse(res, 201, 'Comment added successfully', comment);
    })
);

router.patch('/:commentId', authMiddleware, asyncHandler(async (req,res) =>{
        const userId = req.user.id;
        const { commentId } = req.params;
        const { text } = req.body;

        if (!text) {
            return errorResponse(res, 400, 'Comment text is required');
        }
        const updatedComment = await commentService.editComment({
            commentId,
            userId,
            text
        });
        return successResponse(res, 200, 'Comment updated successfully', updatedComment);
}));

router.delete('/:commentId', authMiddleware, asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { commentId } = req.params;   
        const deletedComment = await commentService.deleteComment({
            commentId,
            userId
        });
        return successResponse(res, 200, 'Comment deleted successfully', deletedComment);
    })
);

router.get('/:quoteId', asyncHandler(async (req, res) => {
        const { quoteId } = req.params;
        const { parentCommentId, cursor, limit } = req.query;

        const data = await commentService.getComments({
            quoteId,
            parentCommentId,
            cursor,
            limit: parseInt(limit) || 20
        });

        return successResponse(res, 200, 'Comments retrieved successfully', data);
    })
);

router.post('/:commentId/like', authMiddleware, asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { commentId } = req.params;

        const result = await commentService.toggleLike({
            commentId,
            userId
        });

        return successResponse(res, 200, 'Comment like toggled', result);
    })
);

module.exports = router;
