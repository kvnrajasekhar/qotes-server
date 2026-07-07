"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const collections_model_1 = __importDefault(
  require("../../models/collections.model"),
);
const collectionItem_model_1 = __importDefault(
  require("../../models/collectionItem.model"),
);
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const collectionService = {
  getUserCollections: async ({ userId, cursor = null, limit = 20 }) => {
    const query = { owner: userId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }
    const collections = await collections_model_1.default
      .find(query)
      .select("name isPrivate isDefault createdAt")
      .sort({ isDefault: -1, createdAt: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = collections.length > limit;
    if (hasMore) collections.pop();
    return {
      collections,
      pagination: {
        nextCursor: hasMore
          ? collections[collections.length - 1].createdAt
          : null,
        hasMore,
      },
    };
  },
  getCollectionDetails: async ({ collectionId, cursor = null, limit = 20 }) => {
    const query = { collectionId };
    if (cursor) {
      query.addedAt = { $lt: new Date(cursor) };
    }
    const items = await collectionItem_model_1.default
      .find(query)
      .sort({ addedAt: -1 })
      .limit(limit + 1)
      .populate({
        path: "quoteId",
        select: "text author category reactions likes saves requotes createdAt",
      })
      .lean();
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    return {
      items: items.map((i) => i.quoteId),
      pagination: {
        nextCursor: hasMore ? items[items.length - 1].addedAt : null,
        hasMore,
      },
    };
  },
  getQuoteDetails: async (quoteId, userId) => {
    const quote = await quote_model_1.default
      .findById(quoteId)
      .populate("creator", "username avatar")
      .lean();
    if (!quote) throw new Error("Quote not found");
    const userReaction = await Reaction.findOne({ quoteId, userId }).select(
      "type",
    );
    const userCollections = await collections_model_1.default
      .find({ owner: userId })
      .distinct("_id");
    const isSaved = await collectionItem_model_1.default.exists({
      quoteId,
      collectionId: { $in: userCollections },
    });
    return {
      ...quote,
      currentUserReaction: userReaction ? userReaction.type : null,
      isSaved: !!isSaved,
    };
  },
  toggleSave: async (userId, quoteId, collectionId = null) => {
    let targetCollectionId = collectionId;
    if (!targetCollectionId) {
      let defaultCollection = await collections_model_1.default.findOne({
        owner: userId,
        isDefault: true,
      });
      if (!defaultCollection) {
        defaultCollection = await collections_model_1.default.create({
          owner: userId,
          name: "Saved",
          isPrivate: true,
          isDefault: true,
        });
      }
      targetCollectionId = defaultCollection._id;
    } else {
      const isOwner = await collections_model_1.default.exists({
        _id: targetCollectionId,
        owner: userId,
      });
      if (!isOwner) throw new Error("Unauthorized");
    }
    const existing = await collectionItem_model_1.default.findOne({
      collectionId: targetCollectionId,
      quoteId,
    });
    if (existing) {
      await collectionItem_model_1.default.deleteOne({ _id: existing._id });
      await quote_model_1.default.findByIdAndUpdate(quoteId, {
        $inc: { saves: -1 },
      });
      return { saved: false };
    }
    await collectionItem_model_1.default.create({
      collectionId: targetCollectionId,
      quoteId,
    });
    await quote_model_1.default.findByIdAndUpdate(quoteId, {
      $inc: { saves: 1 },
    });
    return { saved: true };
  },
};
exports.default = collectionService;
//# sourceMappingURL=collections.service.js.map
