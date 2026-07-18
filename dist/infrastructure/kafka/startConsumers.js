"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const reaction_consumer_1 = __importDefault(require("./consumers/reaction.consumer"));
const startConsumers = async () => {
    await Promise.all([(0, reaction_consumer_1.default)()]);
    console.log("✅ Kafka consumers started");
};
exports.default = startConsumers;
//# sourceMappingURL=startConsumers.js.map