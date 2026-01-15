const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const {successResponse, errorResponse} = require('./utils/responseFormatter.util');

const port = 3030;
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

let mongooseConnection; 

const connectToDatabase = async () => {
    if (!mongooseConnection) {
        try {
            mongoose.set('strictQuery', false);
            mongooseConnection = await mongoose.connect(MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('MongoDB connected');
        } catch (err) {
            console.error('MongoDB connection error:', err);
            throw err; // Re-throw the error to prevent the app from starting
        }
    }
    return mongooseConnection; 
};

connectToDatabase().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1); // Exit the application if the database connection fails
});

app.get('/',(req,res)=>{
    return successResponse(res,200,'API is running');
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


app.use('/auth',authRouter);
app.use('/user',userRouter);
app.use('/quote',quoteRouter);
app.use('/comment',commentRouter);
app.use('/feed',feedRouter);
app.use('/preference',preferenceRouter);
app.use('/reaction',reactionRouter);
app.use('/safety',safetyRouter);
app.use('/search',searchRouter);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));

app.listen(port,()=>{
    console.log('server is running on ' + port);
});