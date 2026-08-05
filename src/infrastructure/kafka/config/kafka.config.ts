import { Kafka, Producer } from "kafkajs";
import logger from "../../../shared/utils/logger.util";

const kafkaBrokers = [process.env.KAFKA_BROKER || "localhost:9092"];

const kafka = new Kafka({
  clientId: "quotely-server",
  brokers: kafkaBrokers,
  retry: {
    retries: 10,
  },
});

const producer: Producer = kafka.producer();

let isProducerConnected = false;

const connectKafka = async (): Promise<void> => {
  if (!isProducerConnected) {
    await producer.connect();
    isProducerConnected = true;
    logger.info("Kafka producer connected globally", {
      service: "kafka",
      brokers: kafkaBrokers,
    });
  }
};

const isKafkaConnected = (): boolean => isProducerConnected;

export { kafka, producer, connectKafka, isKafkaConnected };
