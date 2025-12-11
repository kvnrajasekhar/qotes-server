// models/token.js
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refreshToken: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '7d' } // Automatically cleans up expired tokens
});

module.exports = mongoose.model('Token', tokenSchema);