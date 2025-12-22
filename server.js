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

app.use('/auth',authRouter);
app.use('/user',userRouter);
app.use('/quote',quoteRouter);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));

app.listen(port,()=>{
    console.log('server is running on ' + port);
});