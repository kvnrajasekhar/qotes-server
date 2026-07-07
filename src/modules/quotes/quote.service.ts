// @ts-nocheck
import Quote from "../../models/quote.model";
import User from "../../models/user.model";
import { addImageGenerationJob } from "../../shared/queues/imageGeneration.queue";
import notificationService from "../notifications/notification.service";
import {
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
} from "../notifications/notification.constants";

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
    const session = await Quote.startSession();
    session.startTransaction();

    try {
      // Validate parent quote if requote
      if (isRequote) {
        if (!parentQuoteId) {
          throw new Error("parentQuoteId is required for requote");
        }

        const parentQuote = await Quote.findOne({
          _id: parentQuoteId,
          isHiddenBySystem: false,
        }).session(session);

        if (!parentQuote) {
          throw new Error("Parent quote not found or hidden");
        }

        // Prevent duplicate requote by same user
        const alreadyRequoted = await Quote.exists({
          creator,
          parentQuoteId,
        }).session(session);

        if (alreadyRequoted) {
          throw new Error("Already requoted");
        }
      }

      const newQuote = await Quote.create(
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
        await Quote.updateOne(
          { _id: parentQuoteId },
          { $inc: { requotes: 1 } },
          { session },
        );

        // Notify original quote creator about requote
        if (NOTIFICATIONS_ENABLED) {
          process.nextTick(async () => {
            try {
              const parentQuote = await Quote.findById(parentQuoteId)
                .select("creator text author")
                .lean();
              const requoter = await User.findById(creator).lean();

              if (
                parentQuote &&
                requoter &&
                parentQuote.creator.toString() !== creator
              ) {
                await notificationService.createNotification({
                  recipient: parentQuote.creator,
                  sender: creator,
                  type: NOTIFICATION_TYPES.REQUOTE_QUOTE,
                  message: `${requoter.username || "Someone"} requoted your quote`,
                  referenceId: savedQuote._id,
                  referenceType: REFERENCE_TYPES.QUOTE,
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
          addImageGenerationJob({ quoteId: savedQuote._id.toString() }).catch(
            (err) => {
              console.error("Failed to enqueue image generation job:", err);
            },
          );
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
    return await Quote.findById(id);
  },
  getAllQuotes: async () => {
    return await Quote.find();
  },
  updateQuote: async (id, updateData) => {
    return await Quote.findByIdAndUpdate(id, updateData, { new: true });
  },
  deleteQuote: async (id) => {
    return await Quote.findByIdAndDelete(id);
  },
  getQuotesByUser: async ({ userId, cursor = null, limit = 20 }) => {
    const query = { creator: userId };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const quotes = await Quote.find(query)
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
    const quote = await Quote.findById(quoteId);
    if (!quote) {
      return null;
    }
    if (!quote.likes.includes(userId)) {
      quote.likes.push(userId);
      await quote.save();
    }
    // return the updated like count
    return { likeCount: quote.likes.length };
  },
};

export default quoteService;
