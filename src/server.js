require('dotenv').config();

const app = require('./app');
const { connectToDatabase } = require('./config/database');
const { connectKafka } = require('./infrastructure/kafka/config/kafka.config');
const initTopics = require('./infrastructure/kafka/initTopics');

const port = process.env.PORT || 3030;

const startOptionalMessaging = async () => {
    try {
        await connectKafka();
        await initTopics();
        app.locals.kafkaReady = true;
        app.locals.kafkaStatus = 'ready';
        console.log('Kafka messaging is ready');
    } catch (err) {
        app.locals.kafkaReady = false;
        app.locals.kafkaStatus = 'unavailable';
        console.error('Kafka is unavailable; API will continue without async messaging:', err.message);
    }
};

const startServer = async () => {
    await connectToDatabase();

    app.listen(port, () => {
        console.log(`Server running on ${port}`);
    });

    startOptionalMessaging();
};

startServer().catch(err => {
    console.error('Failed to start API server:', err);
    process.exit(1);
});
