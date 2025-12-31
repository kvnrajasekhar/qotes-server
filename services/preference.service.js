const UserContentPreference = require('../models/userContentPreference.model');

const preferenceService = {
    savePreference: async ({ userId, type, targetId, reason }) => {
        // updateOne is faster as it doesn't have to fetch and return the document.
        return await UserContentPreference.updateOne(
            { userId, type, targetId },
            {
                $set: { reason, updatedAt: new Date() },
                $setOnInsert: { createdAt: new Date() } // Only sets on new record creation
            },
            { upsert: true }
        );
    },
};

module.exports = preferenceService;