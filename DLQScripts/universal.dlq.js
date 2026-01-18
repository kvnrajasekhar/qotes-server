const { kafka } = require('../config/kafka.config');
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'universal-dlq-replayer' });

const replay = async (dlqTopic, targetTopic) => {
    if (!dlqTopic || !targetTopic) {
        console.error("❌ Usage: node universal-replayer.js <dlqTopic> <targetTopic>");
        process.exit(1);
    }

    try {
        await producer.connect();
        await consumer.connect();
        
        // Subscribe to the specific DLQ provided in params
        await consumer.subscribe({ topic: dlqTopic, fromBeginning: true });

        console.log(`🔄 REPLAY START: [${dlqTopic}] ——> [${targetTopic}]`);

        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    await producer.send({
                        topic: targetTopic,
                        messages: [{
                            key: message.key,
                            value: message.value,
                            headers: {
                                ...message.headers,
                                replayedAt: Date.now().toString(),
                                originalDlq: dlqTopic
                            }
                        }]
                    });
                    
                    console.log(`✅ [${message.key}] Replayed to ${targetTopic}`);
                } catch (sendErr) {
                    console.error(`❌ Failed to send message ${message.key}:`, sendErr.message);
                }
            }
        });
    } catch (err) {
        console.error("❌ Replayer Crash:", err.message);
    }
};

// Capture command line arguments
const [,, source, target] = process.argv;
replay(source, target);