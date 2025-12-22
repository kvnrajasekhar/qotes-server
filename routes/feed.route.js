const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middlewares/auth.middleware');
const feedService = require('../services/feed.service');
const {successResponse, errorResponse} = require('../utils/responseFormatter.util');

router.get('/pagination', authMiddleware,asyncHandler(async(req,res)=>{
    let {page, limit} = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const result = await feedService.pagination(page, limit);
    return successResponse(res,200,'Quotes retrieved successfully',result);
}));

