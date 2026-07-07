"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const userContentPreference_model_1 = __importDefault(
  require("../../models/userContentPreference.model"),
);
const preferenceService = {
  savePreference: async ({ userId, type, targetId, reason }) => {
    return await userContentPreference_model_1.default.updateOne(
      { userId, type, targetId },
      {
        $set: { reason, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  },
};
exports.default = preferenceService;
//# sourceMappingURL=preference.service.js.map
