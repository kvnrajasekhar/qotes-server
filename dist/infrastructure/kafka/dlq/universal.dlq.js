"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const kafka_config_1 = require("../config/kafka.config");
const producer = kafka_config_1.kafka.producer();
const consumer = kafka_config_1.kafka.consumer({
  groupId: "universal-dlq-replayer",
});
const replay = async (dlqTopic, targetTopic) => {
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
      eachMessage: async ({ message }) => {
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
        } catch (sendErr) {
          console.error(
            `❌ Failed to send message ${message.key}:`,
            sendErr.message,
          );
        }
      },
    });
  } catch (err) {
    console.error("❌ Replayer Crash:", err.message);
  }
};
const [, , source, target] = process.argv;
replay(source, target);
//# sourceMappingURL=universal.dlq.js.map
