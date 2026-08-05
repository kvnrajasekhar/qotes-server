import { kafka } from "../config/kafka.config";
import { Producer, Consumer, KafkaMessage } from "kafkajs";

const producer: Producer = kafka.producer();
const consumer: Consumer = kafka.consumer({
  groupId: "universal-dlq-replayer",
});

const replay = async (dlqTopic: string, targetTopic: string): Promise<void> => {
  if (!dlqTopic || !targetTopic) {
    console.error(
      "❌ Usage: node universal-replayer.js <dlqTopic> <targetTopic>",
    );
    process.exit(1);
  }

  try {
    await producer.connect();
    await consumer.connect();

    await consumer.subscribe({ topic: dlqTopic, fromBeginning: true });

    console.log(`🔄 REPLAY START: [${dlqTopic}] ——> [${targetTopic}]`);

    await consumer.run({
      eachMessage: async ({ message }: { message: KafkaMessage }) => {
        try {
          await producer.send({
            topic: targetTopic,
            messages: [
              {
                key: message.key,
                value: message.value,
                headers: {
                  ...message.headers,
                  replayedAt: Date.now().toString(),
                  originalDlq: dlqTopic,
                },
              },
            ],
          });

          console.log(`✅ [${message.key}] Replayed to ${targetTopic}`);
        } catch (sendErr: any) {
          console.error(
            `❌ Failed to send message ${message.key}:`,
            sendErr.message,
          );
        }
      },
    });
  } catch (err: any) {
    console.error("❌ Replayer Crash:", err.message);
  }
};

const [, , source, target] = process.argv;
void replay(source, target);
