const mongoose = require('mongoose');
const { kafka } = require('../config/kafka.config');
const Reaction = require('../models/reaction.model');
const Quote = require('../models/quote.model');

const DLQ_TOPIC = 'reaction-events-dlq';
const consumer = kafka.consumer({ groupId: 'reaction-persistence-group' });
const producer = kafka.producer();

const runReactionWorker = async () => {
    await consumer.connect();
    await producer.connect();
    await consumer.subscribe({ topic: 'reaction-events', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const payload = JSON.parse(message.value.toString());
                const { userId, quoteId, type, action, oldType } = payload;
                if (message.headers && message.headers.replayedAt) {
                    console.log(`🔄 Processing replayed message from: ${message.headers.replayedAt}`);
                }

                const userObjId = new mongoose.Types.ObjectId(userId);
                const quoteObjId = new mongoose.Types.ObjectId(quoteId);

                if (action === 'added') {
                    const existing = await Reaction.findOneAndUpdate(
                        { user: userObjId, quote: quoteObjId },
                        { type },
                        { upsert: true, new: false }
                    );

                    if (!existing) {
                        // Increment specific type in the Map and the general likes if applicable
                        const update = { [`reactions.${type}`]: 1 };
                        if (type === 'like') update.likes = 1;

                        await Quote.findByIdAndUpdate(quoteObjId, { $inc: update });
                    }
                }

                else if (action === 'updated') {
                    // Decrement old type, Increment new type in the Map
                    const update = {
                        [`reactions.${oldType}`]: -1,
                        [`reactions.${type}`]: 1
                    };

                    // Handle the top-level likes field if swapping to/from 'like'
                    if (oldType === 'like') update.likes = -1;
                    if (type === 'like') update.likes = 1;

                    await Promise.all([
                        Reaction.updateOne({ user: userObjId, quote: quoteObjId }, { type }),
                        Quote.findByIdAndUpdate(quoteObjId, { $inc: update })
                    ]);
                }

                else if (action === 'removed') {
                    const deleted = await Reaction.findOneAndDelete({ user: userObjId, quote: quoteObjId });

                    if (deleted) {
                        const update = { [`reactions.${type}`]: -1 };
                        if (type === 'like') update.likes = -1;

                        await Quote.findByIdAndUpdate(quoteObjId, { $inc: update });
                    }
                }

            } catch (err) {
                // Log the error and send to DLQ
                console.error('❌ Consumer Error:', err.message);
                await producer.send({
                    topic: DLQ_TOPIC,
                    messages: [{
                        key: message.key,
                        value: message.value,
                        headers: {
                            error: err.message,
                            timestamp: Date.now().toString(),
                            isRetry: 'true',
                        }
                    }]
                });
            }
        },
    });
};

runReactionWorker();