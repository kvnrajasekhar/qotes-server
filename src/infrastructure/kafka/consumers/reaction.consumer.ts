import mongoose from 'mongoose';
import { kafka } from '../config/kafka.config';
import Reaction from '../../../models/reaction.model';

interface ReactionEventPayload {
  userId: string;
  quoteId: string;
  type?: string;
  action: 'added' | 'updated' | 'removed';
}

const startReactionConsumer = async (): Promise<void> => {
  // Ensure MongoDB is ready before consuming events
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️ MongoDB not connected yet. Waiting for connection...');
    await new Promise<void>((resolve) => {
      mongoose.connection.once('connected', () => resolve());
    });
  }

  const consumer = kafka.consumer({
    groupId: process.env.REACTION_CONSUMER_GROUP || 'reaction-group',
  });

  await consumer.connect();
  await consumer.subscribe({
    topic: 'reaction-events',
    fromBeginning: false,
  });

  console.log('🎧 Reaction consumer started and listening on topic "reaction-events"');

  // Handle graceful shutdowns
  const shutdown = async () => {
    console.log('🛑 Shutting down reaction consumer...');
    try {
      await consumer.disconnect();
    } catch (err) {
      console.error('Error during consumer disconnect:', err);
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await consumer.run({
    eachMessage: async ({  partition, message }) => {
      const rawValue = message.value?.toString();
      if (!rawValue) return;

      try {
        const event: ReactionEventPayload = JSON.parse(rawValue);
        const { userId, quoteId, type, action } = event;

        if (
          !userId ||
          !quoteId ||
          !mongoose.Types.ObjectId.isValid(userId) ||
          !mongoose.Types.ObjectId.isValid(quoteId)
        ) {
          console.error('❌ Invalid or missing ObjectIds in Kafka event:', {
            offset: message.offset,
            userId,
            quoteId,
          });
          return;
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const quoteObjectId = new mongoose.Types.ObjectId(quoteId);

        if (action === 'added' || action === 'updated') {
          if (!type) {
            console.warn('⚠️ Reaction action requires a reaction type:', event);
            return;
          }

          const result = await Reaction.updateOne(
            { user: userObjectId, quote: quoteObjectId },
            { $set: { type } },
            { upsert: true }
          );

          console.log('✅ Reaction upserted:', {
            user: userId,
            quote: quoteId,
            type,
            matchedCount: result.matchedCount,
            upsertedCount: result.upsertedCount,
          });
        } else if (action === 'removed') {
          const result = await Reaction.deleteOne({
            user: userObjectId,
            quote: quoteObjectId,
          });

          console.log('✅ Reaction removed:', {
            user: userId,
            quote: quoteId,
            deletedCount: result.deletedCount,
          });
        } else {
          console.warn('⚠️ Unknown action in event:', action);
        }
      } catch (err) {
        console.error('❌ Consumer processing error on reaction event:', {
          offset: message.offset,
          partition,
          error: err instanceof Error ? err.message : err,
        });
        // Error is logged and skipped so the offset commits instead of getting stuck in a loop
      }
    },
  });
};

export default startReactionConsumer;