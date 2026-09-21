import { kafka } from '../config/kafka.config';

const runConsumer = async () => {
  const consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID || 'auth-events-consumer',
  });

  await consumer.connect();
  console.log('Connected to Aiven Kafka via kafkajs');

  await consumer.subscribe({
    topic: 'auth-events',
    fromBeginning: true,
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('Disconnecting consumer...');
    await consumer.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key ? message.key.toString() : 'null';
      const value = message.value ? message.value.toString() : 'null';

      console.log(
        `Consumed: [topic=${topic} | partition=${partition} | offset=${message.offset}] key=${key}, value=${value}`
      );
    },
  });
};

runConsumer().catch(err => {
  console.error('Kafka consumer error:', err);
  process.exit(1);
});
