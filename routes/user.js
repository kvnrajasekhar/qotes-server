const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Get all users');
});

router.post('/', (req, res) => {
    res.send('Create a new user');
});

router.get('/:id', (req, res) => {
    const userId = req.params.id;
    res.send(`Get user with ID: ${userId}`);
});

module.exports = router;