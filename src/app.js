const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { successResponse, errorResponse } = require('./shared/utils/responseFormatter.util');
const { redis } = require('./shared/utils/redis.utils');
const { observeRequest, getMetricsSnapshot, toPrometheus } = require('./shared/observability/metrics');

const adminRouter = require('./modules/admin/admin.route');
const authRouter = require('./modules/auth/auth.route');
const collectionRouter = require('./modules/collections/collections.route');
const commentRouter = require('./modules/comments/comment.route');
const feedRouter = require('./modules/feeds/feed.route');
const preferenceRouter = require('./modules/preferences/preference.route');
const quoteRouter = require('./modules/quotes/quote.route');
const reactionRouter = require('./modules/reactions/reaction.route');
const safetyRouter = require('./modules/safety/safety.route');
const searchRouter = require('./modules/search/search.route');
const userRouter = require('./modules/users/user.route');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use(observeRequest);

app.get('/', (req, res) => {
    return successResponse(res, 200, 'API is running');
});

app.get('/health', (req, res) => {
    return successResponse(res, 200, 'Service is healthy', {
        service: 'qotes-api',
        uptime: process.uptime(),
    });
});

app.get('/ready', (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = redis.status === 'ready';
    const kafkaReady = req.app.locals.kafkaReady === true;

    const readiness = {
        ready: mongoReady,
        service: 'qotes-api',
        dependencies: {
            mongodb: {
                required: true,
                ready: mongoReady,
                state: mongoose.connection.readyState,
            },
            redis: {
                required: false,
                ready: redisReady,
                state: redis.status,
            },
            kafka: {
                required: false,
                ready: kafkaReady,
                state: req.app.locals.kafkaStatus || 'unknown',
            },
        },
    };

    if (!readiness.ready) {
        return errorResponse(res, 503, 'Service is not ready', readiness);
    }

    return successResponse(res, 200, 'Service is ready', readiness);
});

app.get('/metrics', (req, res) => {
    const snapshot = getMetricsSnapshot();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.status(200).send(toPrometheus(snapshot));
});

app.use('/v1/admin', adminRouter);
app.use('/v1/auth', authRouter);
app.use('/v1/collections', collectionRouter);
app.use('/v1/comment', commentRouter);
app.use('/v1/feed', feedRouter);
app.use('/v1/preference', preferenceRouter);
app.use('/v1/quote', quoteRouter);
app.use('/v1/reaction', reactionRouter);
app.use('/v1/safety', safetyRouter);
app.use('/v1/search', searchRouter);
app.use('/v1/user', userRouter);

app.use((req, res) => {
    return errorResponse(res, 404, 'Route not found');
});

app.use((err, req, res, next) => {
    console.error('Unhandled request error:', err);
    return errorResponse(res, err.status || 500, err.message || 'Internal server error');
});

module.exports = app;
