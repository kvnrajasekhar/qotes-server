import mongoose from "mongoose";
import { kafka } from "../config/kafka.config";
import Reaction from "../../../models/reaction.model";

const startReactionConsumer = async (): Promise<void> => {
  const consumer = kafka.consumer({ groupId: "reaction-group" });

  await consumer.connect();
  await consumer.subscribe({ topic: "reaction-events", fromBeginning: false });

  console.log("🎧 Reaction consumer started");

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || "{}");
        const { userId, quoteId, type, action } = event;

        if (
          !mongoose.Types.ObjectId.isValid(userId) ||
          !mongoose.Types.ObjectId.isValid(quoteId)
        ) {
          console.error("❌ Invalid IDs in Kafka event:", { userId, quoteId });
          return;
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const quoteObjectId = new mongoose.Types.ObjectId(quoteId);

        if (action === "added" || action === "updated") {
          const result = await Reaction.updateOne(
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
          const result = await Reaction.deleteOne({
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

export default startReactionConsumer;
