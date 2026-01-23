const express = require('express');
const router = express.Router();
const { successResponse, errorResponse } = require('../utils/response.utils');
const adminService = require('../services/admin.service');

router.get('/allusers', async (req, res) => {
    try {
        const {cursor, limit} = req.query;
        const users = await adminService.getAllUsers(cursor, limit);
        return successResponse(res, 200, 'Fetched all users successfully', users);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch users', error.message);
    }
});

router.get('/hiddenquotes', async (req, res) => {
    try {
        const {cursor, limit} = req.query;
        const quotes = await adminService.getHiddenQuotes(cursor, limit);
        return successResponse(res, 200, 'Fetched hidden quotes successfully', quotes);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch hidden quotes', error.message);
    }   
});

module.exports = router;
