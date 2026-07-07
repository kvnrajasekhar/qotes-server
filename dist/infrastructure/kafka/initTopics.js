"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const kafka_config_1 = require("./config/kafka.config");
const topics_1 = __importDefault(require("./topics"));
const initTopics = async () => {
  const admin = kafka_config_1.kafka.admin();
  try {
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: topics_1.default.AUTH_EVENTS,
          numPartitions: 1,
          replicationFactor: 1,
        },
        {
          topic: topics_1.default.REACTION_EVENTS,
          numPartitions: 1,
          replicationFactor: 1,
        },
      ],
    });
    console.log("✅ Kafka topics initialized");
  } catch (err) {
    console.error("❌ Failed to initialize Kafka topics:", err);
    throw err;
  } finally {
    await admin.disconnect();
  }
};
exports.default = initTopics;
if (require.main === module) {
  initTopics().catch((err) => {
    console.error("Kafka topic initialization failed:", err);
    process.exit(1);
  });
}
//# sourceMappingURL=initTopics.js.map
