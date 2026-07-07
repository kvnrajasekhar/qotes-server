"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const kafka_config_1 = require("../config/kafka.config");
const reaction_model_1 = __importDefault(
  require("../../../models/reaction.model"),
);
const startReactionConsumer = async () => {
  const consumer = kafka_config_1.kafka.consumer({ groupId: "reaction-group" });
  await consumer.connect();
  await consumer.subscribe({ topic: "reaction-events", fromBeginning: false });
  console.log("🎧 Reaction consumer started");
  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || "{}");
        const { userId, quoteId, type, action } = event;
        if (
          !mongoose_1.default.Types.ObjectId.isValid(userId) ||
          !mongoose_1.default.Types.ObjectId.isValid(quoteId)
        ) {
          console.error("❌ Invalid IDs in Kafka event:", { userId, quoteId });
          return;
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const quoteObjectId = new mongoose_1.default.Types.ObjectId(quoteId);
        if (action === "added" || action === "updated") {
          const result = await reaction_model_1.default.updateOne(
            { user: userObjectId, quote: quoteObjectId },
            { $set: { type } },
            { upsert: true },
          );
          console.log("✅ Reaction upserted:", {
            user: userObjectId,
            quote: quoteObjectId,
            type,
            result,
          });
        } else if (action === "removed") {
          console.log("Removing reaction for:", { userId, quoteId });
          const result = await reaction_model_1.default.deleteOne({
            user: userObjectId,
            quote: quoteObjectId,
          });
          console.log("✅ Reaction removed:", { userId, quoteId, result });
        } else {
          console.warn("⚠️ Unknown action in event:", action);
        }
      } catch (err) {
        console.error("❌ Consumer error:", err);
      }
    },
  });
};
exports.default = startReactionConsumer;
//# sourceMappingURL=reaction.consumer.js.map
