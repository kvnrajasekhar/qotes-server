const { addImageGenerationJob } = require("./imageGeneration.queue");
const { enqueueNotificationJob } = require("./quoteNotifications.queue");
const { addScheduledJob } = require("./scheduledCron.queue");
const { addContentSyncJob } = require("./contentSync.queue");

module.exports = {
  addImageGenerationJob,
  enqueueNotificationJob,
  addScheduledJob,
  addContentSyncJob,
};
