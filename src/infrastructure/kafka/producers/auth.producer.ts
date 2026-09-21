import { producer, connectKafka, disconnectKafka } from '../config/kafka.config';

let interval: NodeJS.Timeout | null = null;

const runAuthProducer = async () => {
  // Ensure the shared producer is connected
  await connectKafka();
  console.log('🚀 Producer connected to Aiven Kafka');

  const topic = 'auth-events';
  const key = 'hello';
  const value = 'world';

  interval = setInterval(async () => {
    try {
      const recordMetadata = await producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify({ message: value, timestamp: new Date().toISOString() }),
          },
        ],
      });

      console.log(
        `Produced to ${topic} [partition ${recordMetadata[0].partition} | offset ${recordMetadata[0].offset}]`
      );
    } catch (err) {
      console.error('❌ Failed to produce message:', err);
    }
  }, 1000);
};

const cleanup = async () => {
  if (interval) clearInterval(interval);
  console.log('🛑 Disconnecting producer...');
  await disconnectKafka();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

runAuthProducer().catch(err => {
  console.error('Fatal producer error:', err);
  process.exit(1);
});
