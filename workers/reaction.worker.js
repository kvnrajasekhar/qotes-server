const Reaction = require('../models/reaction.model');
const Quote = require('../models/quote.model');
const consumer = kafka.consumer({ groupId: 'reaction-group' });
const producer = kafka.producer();
const DLQ_TOPIC = 'reaction-events-dlq';

const run = async () => {
    await producer.connect(); 
    await consumer.connect();
    console.log("Consumer and Producer (for DLQ) connected successfully");
    
    await consumer.subscribe({ topic: 'reaction-events' });

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const { userId, quoteId, type, action } = JSON.parse(message.value.toString());

                if (action === 'added') {
                    // 1. Use findOneAndUpdate to check if it already existed
                    // This prevents the "Double Increment" bug
                    const existing = await Reaction.findOneAndUpdate(
                        { user: userId, quote: quoteId },
                        { type },
                        { upsert: true, new: false } // new: false returns the doc BEFORE update
                    );

                    // Only increment Quote count if this is a NEW reaction
                    if (!existing) {
                        await Quote.findByIdAndUpdate(quoteId, { $inc: { reactionsCount: 1 } });
                    }
                }
                else if (action === 'removed') {
                    const deleted = await Reaction.findOneAndDelete({ user: userId, quote: quoteId });

                    // Only decrement if a document actually existed to be deleted
                    if (deleted) {
                        await Quote.findByIdAndUpdate(quoteId, { $inc: { reactionsCount: -1 } });
                    }
                }
                else if (action === 'updated') {
                    // Quote.reactionsCount remains exactly the same.
                    await Reaction.updateOne({ user: userId, quote: quoteId }, { type });
                }

            } catch (err) {
                // MOVE TO DEAD LETTER QUEUE (DLQ)
                await producer.send({
                    topic: DLQ_TOPIC,
                    messages: [{
                        key: message.key,
                        value: message.value,
                        headers: {
                            error: err.message,
                            timestamp: Date.now().toString()
                        }
                    }]
                });
            }
        },
    });
};
run().catch(console.error);

module.exports = {};