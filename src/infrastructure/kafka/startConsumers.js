const startReactionConsumer = require('./consumers/reaction.consumer');

const startConsumers = async () => {
    await Promise.all([
        startReactionConsumer(),
    ]);

    console.log('✅ Kafka consumers started');
};

module.exports = startConsumers;