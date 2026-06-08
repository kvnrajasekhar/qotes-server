const mongoose = require('mongoose');

let mongooseConnection;

const connectToDatabase = async () => {
    if (mongooseConnection) {
        return mongooseConnection;
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI is not configured');
    }

    mongoose.set('strictQuery', false);
    mongooseConnection = await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
    return mongooseConnection;
};

module.exports = { connectToDatabase };
