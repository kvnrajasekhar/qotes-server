import UserContentPreference from "../../models/userContentPreference.model";

type SavePreferenceArgs = {
  userId: string;
  type: string;
  targetId: string;
  reason?: string;
};

const preferenceService = {
  savePreference: async ({ userId, type, targetId, reason }: SavePreferenceArgs) => {
    // updateOne is faster as it doesn't have to fetch and return the document.
    return await UserContentPreference.updateOne(
      { userId, type, targetId },
      {
        $set: { reason, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }, // Only sets on new record creation
      },
      { upsert: true },
    );
  },
};

export default preferenceService;
