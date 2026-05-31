const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { successResponse, errorResponse } = require('./utils/responseFormatter.util');
const { connectKafka, kafka } = require('./kafka/config/kafka.config');
const initTopics = require('./kafka/initTopics');

const port = 3030;
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
console.log(process.env.MONGO_URI);

let mongooseConnection;

const connectToDatabase = async () => {
    if (!mongooseConnection) {
        try {
            mongoose.set('strictQuery', false);
            mongooseConnection = await mongoose.connect(MONGO_URI);
            console.log('MongoDB connected');
        } catch (err) {
            console.error('MongoDB connection error:', err);
            process.exit(1);
        }
    }
    return mongooseConnection;
};

connectToDatabase().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1); // Exit the application if the database connection fails
});

app.get('/', (req, res) => {
    return successResponse(res, 200, 'API is running');
});

const authRouter = require('./routes/auth.route');
const userRouter = require('./routes/user.route');
const quoteRouter = require('./routes/quote.route');
const commentRouter = require('./routes/comment.route');
const feedRouter = require('./routes/feed.route');
const preferenceRouter = require('./routes/preference.route');
const reactionRouter = require('./routes/reaction.route');
const safetyRouter = require('./routes/safety.route');
const searchRouter = require('./routes/search.route');


app.use('/v1/auth', authRouter);
app.use('/v1/user', userRouter);
app.use('/v1/quote', quoteRouter);
app.use('/v1/comment', commentRouter);
app.use('/v1/feed', feedRouter);
app.use('/v1/preference', preferenceRouter);
app.use('/v1/reaction', reactionRouter);
app.use('/v1/safety', safetyRouter);
app.use('/v1/search', searchRouter);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));


const startReactionConsumer = require('./kafka/consumers/reaction.consumer');

const startServer = async () => {
    // Kafka producer connection
    await connectKafka();

    // Create topics automatically
    await initTopics();

    // Start consumers
    await startReactionConsumer();

    // Start Express server
    app.listen(port, () => {
        console.log('🚀 Server running on ' + port);
    });
};

startServer().catch(err => {
    console.error('❌ Failed to start server', err);
    process.exit(1);
});
