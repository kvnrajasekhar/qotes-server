const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'quotely-server',
  brokers: ['localhost:9092'],
  retry: {
    retries: 10
  },
  metadataMaxAge: 10000
});

const producer = kafka.producer();

let isProducerConnected = false;

const connectKafka = async () => {
  if (!isProducerConnected) {
    await producer.connect();
    isProducerConnected = true;
    console.log('✅ Kafka Producer connected globally');
  }
};

module.exports = { kafka, producer, connectKafka };
