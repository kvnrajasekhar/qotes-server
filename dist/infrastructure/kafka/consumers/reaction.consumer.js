"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const kafka_config_1 = require("../config/kafka.config");
const reaction_model_1 = __importDefault(require("../../../models/reaction.model"));
const startReactionConsumer = async () => {
    if (mongoose_1.default.connection.readyState !== 1) {
        console.warn('⚠️ MongoDB not connected yet. Waiting for connection...');
        await new Promise(resolve => {
            mongoose_1.default.connection.once('connected', () => resolve());
        });
    }
    const consumer = kafka_config_1.kafka.consumer({
        groupId: process.env.REACTION_CONSUMER_GROUP || 'reaction-group',
    });
    await consumer.connect();
    await consumer.subscribe({
        topic: 'reaction-events',
        fromBeginning: false,
    });
    console.log('🎧 Reaction consumer started and listening on topic "reaction-events"');
    const shutdown = async () => {
        console.log('🛑 Shutting down reaction consumer...');
        try {
            await consumer.disconnect();
        }
        catch (err) {
            console.error('Error during consumer disconnect:', err);
        }
        finally {
            process.exit(0);
        }
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    await consumer.run({
        eachMessage: async ({ partition, message }) => {
            const rawValue = message.value?.toString();
            if (!rawValue)
                return;
            try {
                const event = JSON.parse(rawValue);
                const { userId, quoteId, type, action } = event;
                if (!userId ||
                    !quoteId ||
                    !mongoose_1.default.Types.ObjectId.isValid(userId) ||
                    !mongoose_1.default.Types.ObjectId.isValid(quoteId)) {
                    console.error('❌ Invalid or missing ObjectIds in Kafka event:', {
                        offset: message.offset,
                        userId,
                        quoteId,
                    });
                    return;
                }
                const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
                const quoteObjectId = new mongoose_1.default.Types.ObjectId(quoteId);
                if (action === 'added' || action === 'updated') {
                    if (!type) {
                        console.warn('⚠️ Reaction action requires a reaction type:', event);
                        return;
                    }
                    const result = await reaction_model_1.default.updateOne({ user: userObjectId, quote: quoteObjectId }, { $set: { type } }, { upsert: true });
                    console.log('✅ Reaction upserted:', {
                        user: userId,
                        quote: quoteId,
                        type,
                        matchedCount: result.matchedCount,
                        upsertedCount: result.upsertedCount,
                    });
                }
                else if (action === 'removed') {
                    const result = await reaction_model_1.default.deleteOne({
                        user: userObjectId,
                        quote: quoteObjectId,
                    });
                    console.log('✅ Reaction removed:', {
                        user: userId,
                        quote: quoteId,
                        deletedCount: result.deletedCount,
                    });
                }
                else {
                    console.warn('⚠️ Unknown action in event:', action);
                }
            }
            catch (err) {
                console.error('❌ Consumer processing error on reaction event:', {
                    offset: message.offset,
                    partition,
                    error: err instanceof Error ? err.message : err,
                });
            }
        },
    });
};
exports.default = startReactionConsumer;
//# sourceMappingURL=reaction.consumer.js.map