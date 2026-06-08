const { kafka } = require('./config/kafka.config');
const TOPICS = require('./topics');

const initTopics = async () => {
    const admin = kafka.admin();

    try {
        await admin.connect();

        await admin.createTopics({
            waitForLeaders: true,
            topics: [
                {
                    topic: TOPICS.AUTH_EVENTS,
                    numPartitions: 1,
                    replicationFactor: 1,
                },
                {
                    topic: TOPICS.REACTION_EVENTS,
                    numPartitions: 1,
                    replicationFactor: 1,
                },
            ],
        });

        console.log('✅ Kafka topics initialized');
    } catch (err) {
        console.error('❌ Failed to initialize Kafka topics:', err);
        throw err;
    } finally {
        await admin.disconnect();
    }
};

module.exports = initTopics;

if (require.main === module) {
    initTopics().catch(err => {
        console.error('Kafka topic initialization failed:', err);
        process.exit(1);
    });
}
