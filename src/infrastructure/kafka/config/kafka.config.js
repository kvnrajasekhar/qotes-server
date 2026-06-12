const { Kafka } = require("kafkajs");
const logger = require("../../../shared/utils/logger.util");

const kafkaBrokers = [process.env.KAFKA_BROKER || "localhost:9092"];

const kafka = new Kafka({
  clientId: "quotely-server",
  brokers: kafkaBrokers,
  retry: {
    retries: 10,
  },
  metadataMaxAge: 10000,
});

const producer = kafka.producer();

let isProducerConnected = false;

const connectKafka = async () => {
  if (!isProducerConnected) {
    await producer.connect();
    isProducerConnected = true;
    logger.info("Kafka producer connected globally", {
      service: "kafka",
      brokers: kafkaBrokers,
    });
  }
};

module.exports = { kafka, producer, connectKafka };
