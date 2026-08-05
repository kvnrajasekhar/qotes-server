import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import Quote, { IQuote } from '../../models/quote.model';
import User, { IUser } from '../../models/user.model';
import { addImageGenerationJob } from '../../shared/queues/imageGeneration.queue';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_TYPES, REFERENCE_TYPES } from '../notifications/notification.constants';
import { buildCursorQuery, processPaginatedResults } from '../../shared/utils/cursor.util';
import { QuoteCacheService } from '../../infrastructure/cache/quote.cache';
import { CacheInvalidationService } from '../../infrastructure/cache/cache-invalidation.service';

const IMAGE_GENERATION_ENABLED = process.env.IMAGE_GENERATION_ENABLED === 'true';
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
    @InjectModel(User.name) private userModel: Model<IUser>,
    private notificationsService: NotificationsService,
    private readonly quoteCache: QuoteCacheService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async createQuote({
    text,
    author,
    category,
    hashtags = [],
    taggedUsers = [],
    creator,
    isRequote = false,
    parentQuoteId = null,
    isHiddenBySystem = false,
  }: {
    text: string;
    author?: string;
    category?: string;
    hashtags?: string[];
    taggedUsers?: string[];
    creator: string;
    isRequote?: boolean;
    parentQuoteId?: string;
    isHiddenBySystem?: boolean;
  }) {
    const session = await this.quoteModel.startSession();
    session.startTransaction();

    try {
      if (isRequote) {
        if (!parentQuoteId) {
          throw new BadRequestException('parentQuoteId is required for requote');
        }

        const parentQuote = await this.quoteModel.findOne({
          _id: parentQuoteId,
          isHiddenBySystem: false,
        }).session(session);

        if (!parentQuote) {
          throw new NotFoundException('Parent quote not found or hidden');
        }

        const alreadyRequoted = await this.quoteModel.exists({
          creator,
          parentQuoteId,
        }).session(session);

        if (alreadyRequoted) {
          throw new BadRequestException('Already requoted');
        }
      }

      const newQuote = await this.quoteModel.create(
        [
          {
            text,
            author: author || 'Anonymous',
            category: category || '',
            hashtags: hashtags || [],
            taggedUsers,
            creator,
            isRequote,
            parentQuoteId,
            isHiddenBySystem,
          },
        ],
        { session }
      );

      if (isRequote) {
        await this.quoteModel.updateOne({ _id: parentQuoteId }, { $inc: { requotes: 1 } }, { session });

        if (NOTIFICATIONS_ENABLED) {
          void process.nextTick(async () => {
            try {
              const parentQuote = await this.quoteModel.findById(parentQuoteId)
                .select('creator text author')
                .lean();
              const requoter = await this.userModel.findById(creator).lean();

              if (parentQuote && requoter && parentQuote.creator.toString() !== creator) {
                await this.notificationsService.createNotification({
                  recipient: parentQuote.creator.toString(),
                  sender: creator,
                  type: NOTIFICATION_TYPES.REQUOTE_QUOTE,
                  message: `${requoter.username || 'Someone'} requoted your quote`,
                  referenceId: newQuote[0]._id.toString(),
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
              console.error('Failed to create requote notification:', error);
            }
          });
        }
      }

      void session.commitTransaction();
      void session.endSession();

      const savedQuote = newQuote[0];
      
      // Warm up cache for new quote
      await this.quoteCache.warmUpQuoteCache(savedQuote);
      
      // Invalidate user quotes cache and feeds
      this.cacheInvalidation.emitQuoteCreated(savedQuote._id.toString(), creator);
      
      if (IMAGE_GENERATION_ENABLED) {
        void process.nextTick(() => {
          addImageGenerationJob({ quoteId: savedQuote._id.toString() }).catch(err => {
            console.error('Failed to enqueue image generation job:', err);
          });
        });
      }
      return savedQuote;
    } catch (error) {
      void session.abortTransaction();
      void session.endSession();
      throw error;
    }
  }

  async getQuoteById(id: string) {
    return await this.quoteCache.getQuote(id, async () => {
      const quote = await this.quoteModel.findById(id);
      if (!quote) {
        throw new NotFoundException('Quote not found');
      }
      return quote;
    });
  }

  async getAllQuotes() {
    return await this.quoteModel.find();
  }

  async updateQuote(id: string, updateData: any) {
    const updatedQuote = await this.quoteModel.findByIdAndUpdate(id, updateData, { new: true });
    if (updatedQuote) {
      // Invalidate quote cache
      this.cacheInvalidation.emitQuoteUpdated(id);
      // Warm up cache with updated quote
      await this.quoteCache.warmUpQuoteCache(updatedQuote);
    }
    return updatedQuote;
  }

  async deleteQuote(id: string) {
    const quote = await this.quoteModel.findById(id);
    if (quote) {
      await this.quoteModel.findByIdAndDelete(id);
      // Invalidate quote cache
      this.cacheInvalidation.emitQuoteDeleted(id, quote.creator?.toString() || '');
      return quote;
    }
    return null;
  }

  async getQuotesByUser({ userId, cursor = null, limit = 20 }: { userId: string; cursor?: string | null; limit?: number }) {
    const query = { creator: userId };

    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, 'createdAt', -1));
    }

    const quotes = await this.quoteModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const { data, pagination } = processPaginatedResults(quotes, limit, ['createdAt']);

    return {
      quotes: data,
      pagination,
    };
  }

  async likeQuote(quoteId: string, _userId: string) {
    const quote = await this.quoteModel.findById(quoteId);
    if (!quote) {
      return null;
    }
    await this.quoteModel.findByIdAndUpdate(quoteId, { $inc: { likes: 1 } });
    const updatedQuote = await this.quoteModel.findById(quoteId);
    return { likeCount: updatedQuote?.likes || 0 };
  }
}
