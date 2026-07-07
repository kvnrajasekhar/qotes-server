"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const imageGeneration_queue_1 = require("../../shared/queues/imageGeneration.queue");
const notification_service_1 = __importDefault(
  require("../notifications/notification.service"),
);
const notification_constants_1 = require("../notifications/notification.constants");
const IMAGE_GENERATION_ENABLED =
  process.env.IMAGE_GENERATION_ENABLED === "true";
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === "true";
const quoteService = {
  createQuote: async ({
    text,
    author,
    category,
    hashtags = [],
    taggedUsers = [],
    creator,
    isRequote = false,
    parentQuoteId = null,
    isHiddenBySystem = false,
  }) => {
    const session = await quote_model_1.default.startSession();
    session.startTransaction();
    try {
      if (isRequote) {
        if (!parentQuoteId) {
          throw new Error("parentQuoteId is required for requote");
        }
        const parentQuote = await quote_model_1.default
          .findOne({
            _id: parentQuoteId,
            isHiddenBySystem: false,
          })
          .session(session);
        if (!parentQuote) {
          throw new Error("Parent quote not found or hidden");
        }
        const alreadyRequoted = await quote_model_1.default
          .exists({
            creator,
            parentQuoteId,
          })
          .session(session);
        if (alreadyRequoted) {
          throw new Error("Already requoted");
        }
      }
      const newQuote = await quote_model_1.default.create(
        [
          {
            text,
            author: author || "Anonymous",
            category: category || "",
            hashtags: hashtags || [],
            taggedUsers,
            creator,
            isRequote,
            parentQuoteId,
            isHiddenBySystem,
          },
        ],
        { session },
      );
      if (isRequote) {
        await quote_model_1.default.updateOne(
          { _id: parentQuoteId },
          { $inc: { requotes: 1 } },
          { session },
        );
        if (NOTIFICATIONS_ENABLED) {
          process.nextTick(async () => {
            try {
              const parentQuote = await quote_model_1.default
                .findById(parentQuoteId)
                .select("creator text author")
                .lean();
              const requoter = await user_model_1.default
                .findById(creator)
                .lean();
              if (
                parentQuote &&
                requoter &&
                parentQuote.creator.toString() !== creator
              ) {
                await notification_service_1.default.createNotification({
                  recipient: parentQuote.creator,
                  sender: creator,
                  type: notification_constants_1.NOTIFICATION_TYPES
                    .REQUOTE_QUOTE,
                  message: `${requoter.username || "Someone"} requoted your quote`,
                  referenceId: savedQuote._id,
                  referenceType: notification_constants_1.REFERENCE_TYPES.QUOTE,
                  metadata: {
                    originalQuoteId: parentQuoteId,
                    originalQuoteText: parentQuote.text,
                    originalQuoteAuthor: parentQuote.author,
                    senderName: requoter.username,
                  },
                });
              }
            } catch (error) {
              console.error("Failed to create requote notification:", error);
            }
          });
        }
      }
      await session.commitTransaction();
      session.endSession();
      const savedQuote = newQuote[0];
      if (IMAGE_GENERATION_ENABLED) {
        process.nextTick(() => {
          (0, imageGeneration_queue_1.addImageGenerationJob)({
            quoteId: savedQuote._id.toString(),
          }).catch((err) => {
            console.error("Failed to enqueue image generation job:", err);
          });
        });
      }
      return savedQuote;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },
  getQuoteById: async (id) => {
    return await quote_model_1.default.findById(id);
  },
  getAllQuotes: async () => {
    return await quote_model_1.default.find();
  },
  updateQuote: async (id, updateData) => {
    return await quote_model_1.default.findByIdAndUpdate(id, updateData, {
      new: true,
    });
  },
  deleteQuote: async (id) => {
    return await quote_model_1.default.findByIdAndDelete(id);
  },
  getQuotesByUser: async ({ userId, cursor = null, limit = 20 }) => {
    const query = { creator: userId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }
    const quotes = await quote_model_1.default
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = quotes.length > limit;
    if (hasMore) quotes.pop();
    return {
      quotes,
      pagination: {
        nextCursor: hasMore ? quotes[quotes.length - 1].createdAt : null,
        hasMore,
      },
    };
  },
  likeQuote: async (quoteId, userId) => {
    const quote = await quote_model_1.default.findById(quoteId);
    if (!quote) {
      return null;
    }
    if (!quote.likes.includes(userId)) {
      quote.likes.push(userId);
      await quote.save();
    }
    return { likeCount: quote.likes.length };
  },
};
exports.default = quoteService;
//# sourceMappingURL=quote.service.js.map
