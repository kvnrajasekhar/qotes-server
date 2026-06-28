import startReactionConsumer from "./consumers/reaction.consumer";

const startConsumers = async (): Promise<void> => {
  await Promise.all([startReactionConsumer()]);

  console.log("✅ Kafka consumers started");
};

export default startConsumers;
