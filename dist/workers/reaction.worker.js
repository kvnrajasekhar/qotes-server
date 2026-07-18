"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const logger_util_1 = __importDefault(require("../shared/utils/logger.util"));
const database_1 = require("../config/database");
const kafka_config_1 = require("../infrastructure/kafka/config/kafka.config");
const reaction_model_1 = __importDefault(require("../models/reaction.model"));
const quote_model_1 = __importDefault(require("../models/quote.model"));
dotenv_1.default.config();
const DLQ_TOPIC = "reaction-events-dlq";
const consumer = kafka_config_1.kafka.consumer({ groupId: "reaction-persistence-group" });
const buildMessageMeta = (topic, partition, message, payload) => ({
    topic,
    partition,
    offset: message.offset,
    key: message.key?.toString() || null,
    replayedAt: message.headers?.replayedAt?.toString() || null,
    traceId: message.headers?.traceId?.toString() || null,
    userId: payload?.userId || null,
    quoteId: payload?.quoteId || null,
    action: payload?.action || null,
});
const runReactionWorker = async () => {
    await (0, database_1.connectToDatabase)();
    await consumer.connect();
    await kafka_config_1.producer.connect();
    await consumer.subscribe({ topic: "reaction-events", fromBeginning: false });
    logger_util_1.default.info("Reaction consumer worker started", {
        service: "reaction-worker",
        groupId: "reaction-persistence-group",
        topic: "reaction-events",
    });
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const payload = JSON.parse(message.value?.toString() || "{}");
            const meta = buildMessageMeta(topic, partition, message, payload);
            logger_util_1.default.info("Kafka reaction event received", meta);
            if (meta.replayedAt) {
                logger_util_1.default.debug("Processing replayed Kafka message", meta);
            }
            try {
                const userObjId = new mongoose_1.default.Types.ObjectId(payload.userId);
                const quoteObjId = new mongoose_1.default.Types.ObjectId(payload.quoteId);
                if (payload.action === "added") {
                    const existing = await reaction_model_1.default.findOneAndUpdate({ user: userObjId, quote: quoteObjId }, { type: payload.type }, { upsert: true, new: false });
                    if (!existing) {
                        const update = { [`reactions.${payload.type}`]: 1 };
                        if (payload.type === "like")
                            update.likes = 1;
                        await quote_model_1.default.findByIdAndUpdate(quoteObjId, { $inc: update });
                        logger_util_1.default.info("Processed reaction added event", {
                            ...meta,
                            result: "added",
                            type: payload.type,
                        });
                    }
                }
                else if (payload.action === "updated") {
                    const update = {
                        [`reactions.${payload.oldType}`]: -1,
                        [`reactions.${payload.type}`]: 1,
                    };
                    if (payload.oldType === "like")
                        update.likes = -1;
                    if (payload.type === "like")
                        update.likes = 1;
                    await Promise.all([
                        reaction_model_1.default.updateOne({ user: userObjId, quote: quoteObjId }, { type: payload.type }),
                        quote_model_1.default.findByIdAndUpdate(quoteObjId, { $inc: update }),
                    ]);
                    logger_util_1.default.info("Processed reaction updated event", {
                        ...meta,
                        result: "updated",
                        oldType: payload.oldType,
                        type: payload.type,
                    });
                }
                else if (payload.action === "removed") {
                    const deleted = await reaction_model_1.default.findOneAndDelete({
                        user: userObjId,
                        quote: quoteObjId,
                    });
                    if (deleted) {
                        const update = { [`reactions.${payload.type}`]: -1 };
                        if (payload.type === "like")
                            update.likes = -1;
                        await quote_model_1.default.findByIdAndUpdate(quoteObjId, { $inc: update });
                        logger_util_1.default.info("Processed reaction removed event", {
                            ...meta,
                            result: "removed",
                        });
                    }
                }
                else {
                    logger_util_1.default.warn("Received unsupported reaction action", meta);
                }
            }
            catch (err) {
                logger_util_1.default.error("Kafka reaction processing failed, sending to DLQ", {
                    ...meta,
                    error: err,
                });
                await kafka_config_1.producer.send({
                    topic: DLQ_TOPIC,
                    messages: [
                        {
                            key: message.key?.toString() || null,
                            value: message.value,
                            headers: {
                                error: err.message,
                                stack: err.stack || "",
                                timestamp: Date.now().toString(),
                                isRetry: "true",
                            },
                        },
                    ],
                });
            }
        },
    });
};
runReactionWorker().catch((err) => {
    logger_util_1.default.error("Reaction worker failed to start", { error: err });
    process.exit(1);
});
//# sourceMappingURL=reaction.worker.js.map