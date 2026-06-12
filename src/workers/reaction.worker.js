require("dotenv").config();

const mongoose = require("mongoose");
const logger = require("../shared/utils/logger.util");
const { connectToDatabase } = require("../config/database");
const { kafka } = require("../infrastructure/kafka/config/kafka.config");
const Reaction = require("../models/reaction.model");
const Quote = require("../models/quote.model");

const DLQ_TOPIC = "reaction-events-dlq";
const consumer = kafka.consumer({ groupId: "reaction-persistence-group" });
const producer = kafka.producer();

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
  await connectToDatabase();
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: "reaction-events", fromBeginning: false });

  logger.info("Reaction consumer worker started", {
    service: "reaction-worker",
    groupId: "reaction-persistence-group",
    topic: "reaction-events",
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const payload = JSON.parse(message.value.toString());
      const meta = buildMessageMeta(topic, partition, message, payload);

      logger.info("Kafka reaction event received", meta);

      if (meta.replayedAt) {
        logger.debug("Processing replayed Kafka message", meta);
      }

      try {
        const userObjId = new mongoose.Types.ObjectId(payload.userId);
        const quoteObjId = new mongoose.Types.ObjectId(payload.quoteId);

        if (payload.action === "added") {
          const existing = await Reaction.findOneAndUpdate(
            { user: userObjId, quote: quoteObjId },
            { type: payload.type },
            { upsert: true, new: false },
          );

          if (!existing) {
            const update = { [`reactions.${payload.type}`]: 1 };
            if (payload.type === "like") update.likes = 1;

            await Quote.findByIdAndUpdate(quoteObjId, { $inc: update });
            logger.info("Processed reaction added event", {
              ...meta,
              result: "added",
              type: payload.type,
            });
          }
        } else if (payload.action === "updated") {
          const update = {
            [`reactions.${payload.oldType}`]: -1,
            [`reactions.${payload.type}`]: 1,
          };

          if (payload.oldType === "like") update.likes = -1;
          if (payload.type === "like") update.likes = 1;

          await Promise.all([
            Reaction.updateOne(
              { user: userObjId, quote: quoteObjId },
              { type: payload.type },
            ),
            Quote.findByIdAndUpdate(quoteObjId, { $inc: update }),
          ]);

          logger.info("Processed reaction updated event", {
            ...meta,
            result: "updated",
            oldType: payload.oldType,
            type: payload.type,
          });
        } else if (payload.action === "removed") {
          const deleted = await Reaction.findOneAndDelete({
            user: userObjId,
            quote: quoteObjId,
          });

          if (deleted) {
            const update = { [`reactions.${payload.type}`]: -1 };
            if (payload.type === "like") update.likes = -1;

            await Quote.findByIdAndUpdate(quoteObjId, { $inc: update });
            logger.info("Processed reaction removed event", {
              ...meta,
              result: "removed",
            });
          }
        } else {
          logger.warn("Received unsupported reaction action", meta);
        }
      } catch (err) {
        logger.error("Kafka reaction processing failed, sending to DLQ", {
          ...meta,
          error: err,
        });

        await producer.send({
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
  logger.error("Reaction worker failed to start", { error: err });
  process.exit(1);
});
