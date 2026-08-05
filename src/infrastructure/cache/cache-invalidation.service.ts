import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheManagerService } from './cache-manager.service';
import { UserCacheService } from './user.cache';
import { QuoteCacheService } from './quote.cache';
import { SearchCacheService } from './search.cache';
import { CollectionsCacheService } from './collections.cache';
import { NotificationsCacheService } from './notifications.cache';

export enum CacheInvalidationEvent {
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  QUOTE_CREATED = 'quote.created',
  QUOTE_UPDATED = 'quote.updated',
  QUOTE_DELETED = 'quote.deleted',
  FOLLOW_TOGGLED = 'follow.toggled',
  REACTION_UPDATED = 'reaction.updated',
  COMMENT_ADDED = 'comment.added',
  COMMENT_UPDATED = 'comment.updated',
  COMMENT_DELETED = 'comment.deleted',
  COLLECTION_CREATED = 'collection.created',
  COLLECTION_UPDATED = 'collection.updated',
  COLLECTION_DELETED = 'collection.deleted',
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_READ = 'notification.read',
}

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheManager: CacheManagerService,
    private readonly userCache: UserCacheService,
    private readonly quoteCache: QuoteCacheService,
    private readonly searchCache: SearchCacheService,
    private readonly collectionsCache: CollectionsCacheService,
    private readonly notificationsCache: NotificationsCacheService,
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // User events
    this.eventEmitter.on(CacheInvalidationEvent.USER_UPDATED, async (userId: string) => {
      await this.handleUserUpdate(userId);
    });

    this.eventEmitter.on(CacheInvalidationEvent.USER_DELETED, async (userId: string) => {
      await this.handleUserDelete(userId);
    });

    // Quote events
    this.eventEmitter.on(CacheInvalidationEvent.QUOTE_CREATED, async (data: { quoteId: string, creatorId: string }) => {
      await this.handleQuoteCreate(data);
    });

    this.eventEmitter.on(CacheInvalidationEvent.QUOTE_UPDATED, async (quoteId: string) => {
      await this.handleQuoteUpdate(quoteId);
    });

    this.eventEmitter.on(CacheInvalidationEvent.QUOTE_DELETED, async (data: { quoteId: string, creatorId: string }) => {
      await this.handleQuoteDelete(data);
    });

    // Social events
    this.eventEmitter.on(CacheInvalidationEvent.FOLLOW_TOGGLED, async (data: { followerId: string, targetId: string }) => {
      await this.handleFollowToggle(data);
    });

    this.eventEmitter.on(CacheInvalidationEvent.REACTION_UPDATED, async (quoteId: string) => {
      await this.handleReactionUpdate(quoteId);
    });

    // Comment events
    this.eventEmitter.on(CacheInvalidationEvent.COMMENT_ADDED, async (quoteId: string) => {
      await this.handleCommentAdd(quoteId);
    });

    this.eventEmitter.on(CacheInvalidationEvent.COMMENT_UPDATED, async (quoteId: string) => {
      await this.handleCommentUpdate(quoteId);
    });

    this.eventEmitter.on(CacheInvalidationEvent.COMMENT_DELETED, async (quoteId: string) => {
      await this.handleCommentDelete(quoteId);
    });

    // Collection events
    this.eventEmitter.on(CacheInvalidationEvent.COLLECTION_CREATED, async (userId: string) => {
      await this.handleCollectionCreate(userId);
    });

    this.eventEmitter.on(CacheInvalidationEvent.COLLECTION_UPDATED, async (data: { collectionId: string, userId: string }) => {
      await this.handleCollectionUpdate(data);
    });

    this.eventEmitter.on(CacheInvalidationEvent.COLLECTION_DELETED, async (data: { collectionId: string, userId: string }) => {
      await this.handleCollectionDelete(data);
    });

    // Notification events
    this.eventEmitter.on(CacheInvalidationEvent.NOTIFICATION_CREATED, async (userId: string) => {
      await this.handleNotificationCreate(userId);
    });

    this.eventEmitter.on(CacheInvalidationEvent.NOTIFICATION_READ, async (userId: string) => {
      await this.handleNotificationRead(userId);
    });
  }

  // Event handlers
  private async handleUserUpdate(userId: string): Promise<void> {
    try {
      await this.userCache.invalidateUserCache(userId);
      await this.quoteCache.invalidateFollowingFeed(userId);
      this.logger.debug(`Invalidated cache for user update: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for user update: ${userId}`, error);
    }
  }

  private async handleUserDelete(userId: string): Promise<void> {
    try {
      await this.userCache.invalidateUserCache(userId);
      await this.quoteCache.invalidateUserQuotesCache(userId);
      await this.quoteCache.invalidateFollowingFeed(userId);
      await this.collectionsCache.invalidateUserCollectionsCache(userId);
      await this.notificationsCache.invalidateUserNotificationsCache(userId);
      this.logger.debug(`Invalidated all cache for deleted user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for user delete: ${userId}`, error);
    }
  }

  private async handleQuoteCreate(data: { quoteId: string, creatorId: string }): Promise<void> {
    try {
      await this.quoteCache.invalidateUserQuotesCache(data.creatorId);
      await this.quoteCache.invalidateFeedCaches();
      await this.searchCache.invalidateAllSearchCache();
      this.logger.debug(`Invalidated cache for quote creation: ${data.quoteId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for quote creation: ${data.quoteId}`, error);
    }
  }

  private async handleQuoteUpdate(quoteId: string): Promise<void> {
    try {
      await this.quoteCache.invalidateQuoteCache(quoteId);
      await this.quoteCache.invalidateFeedCaches();
      this.logger.debug(`Invalidated cache for quote update: ${quoteId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for quote update: ${quoteId}`, error);
    }
  }

  private async handleQuoteDelete(data: { quoteId: string, creatorId: string }): Promise<void> {
    try {
      await this.quoteCache.invalidateQuoteCache(data.quoteId);
      await this.quoteCache.invalidateUserQuotesCache(data.creatorId);
      await this.quoteCache.invalidateFeedCaches();
      await this.searchCache.invalidateAllSearchCache();
      this.logger.debug(`Invalidated cache for quote deletion: ${data.quoteId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for quote deletion: ${data.quoteId}`, error);
    }
  }

  private async handleFollowToggle(data: { followerId: string, targetId: string }): Promise<void> {
    try {
      await this.userCache.invalidateUserCache(data.followerId);
      await this.userCache.invalidateUserCache(data.targetId);
      await this.quoteCache.invalidateFollowingFeed(data.followerId);
      await this.cacheManager.invalidateSocialCache(data.followerId);
      this.logger.debug(`Invalidated cache for follow toggle: ${data.followerId} -> ${data.targetId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for follow toggle`, error);
    }
  }

  private async handleReactionUpdate(quoteId: string): Promise<void> {
    try {
      await this.quoteCache.invalidateQuoteCache(quoteId);
      this.logger.debug(`Invalidated cache for reaction update: ${quoteId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for reaction update: ${quoteId}`, error);
    }
  }

  private async handleCommentAdd(quoteId: string): Promise<void> {
    try {
      await this.quoteCache.invalidateQuoteCache(quoteId);
      this.logger.debug(`Invalidated cache for comment add: ${quoteId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for comment add: ${quoteId}`, error);
    }
  }

  private async handleCommentUpdate(quoteId: string): Promise<void> {
    try {
      await this.quoteCache.invalidateQuoteCache(quoteId);
      this.logger.debug(`Invalidated cache for comment update: ${quoteId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for comment update: ${quoteId}`, error);
    }
  }

  private async handleCommentDelete(quoteId: string): Promise<void> {
    try {
      await this.quoteCache.invalidateQuoteCache(quoteId);
      this.logger.debug(`Invalidated cache for comment delete: ${quoteId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for comment delete: ${quoteId}`, error);
    }
  }

  private async handleCollectionCreate(userId: string): Promise<void> {
    try {
      await this.collectionsCache.invalidateUserCollectionsCache(userId);
      this.logger.debug(`Invalidated cache for collection creation: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for collection creation: ${userId}`, error);
    }
  }

  private async handleCollectionUpdate(data: { collectionId: string, userId: string }): Promise<void> {
    try {
      await this.collectionsCache.invalidateUserCollectionsCache(data.userId);
      await this.collectionsCache.invalidateCollectionItemsCache(data.collectionId);
      this.logger.debug(`Invalidated cache for collection update: ${data.collectionId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for collection update: ${data.collectionId}`, error);
    }
  }

  private async handleCollectionDelete(data: { collectionId: string, userId: string }): Promise<void> {
    try {
      await this.collectionsCache.invalidateUserCollectionsCache(data.userId);
      await this.collectionsCache.invalidateCollectionItemsCache(data.collectionId);
      this.logger.debug(`Invalidated cache for collection deletion: ${data.collectionId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for collection deletion: ${data.collectionId}`, error);
    }
  }

  private async handleNotificationCreate(userId: string): Promise<void> {
    try {
      await this.notificationsCache.invalidateNotificationCount(userId);
      await this.notificationsCache.invalidateRecentNotifications(userId);
      this.logger.debug(`Invalidated cache for notification creation: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for notification creation: ${userId}`, error);
    }
  }

  private async handleNotificationRead(userId: string): Promise<void> {
    try {
      await this.notificationsCache.invalidateNotificationCount(userId);
      await this.notificationsCache.invalidateRecentNotifications(userId);
      this.logger.debug(`Invalidated cache for notification read: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for notification read: ${userId}`, error);
    }
  }

  // Public methods to emit events
  emitUserUpdated(userId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.USER_UPDATED, userId);
  }

  emitUserDeleted(userId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.USER_DELETED, userId);
  }

  emitQuoteCreated(quoteId: string, creatorId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.QUOTE_CREATED, { quoteId, creatorId });
  }

  emitQuoteUpdated(quoteId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.QUOTE_UPDATED, quoteId);
  }

  emitQuoteDeleted(quoteId: string, creatorId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.QUOTE_DELETED, { quoteId, creatorId });
  }

  emitFollowToggled(followerId: string, targetId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.FOLLOW_TOGGLED, { followerId, targetId });
  }

  emitReactionUpdated(quoteId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.REACTION_UPDATED, quoteId);
  }

  emitCommentAdded(quoteId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.COMMENT_ADDED, quoteId);
  }

  emitCommentUpdated(quoteId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.COMMENT_UPDATED, quoteId);
  }

  emitCommentDeleted(quoteId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.COMMENT_DELETED, quoteId);
  }

  emitCollectionCreated(userId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.COLLECTION_CREATED, userId);
  }

  emitCollectionUpdated(collectionId: string, userId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.COLLECTION_UPDATED, { collectionId, userId });
  }

  emitCollectionDeleted(collectionId: string, userId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.COLLECTION_DELETED, { collectionId, userId });
  }

  emitNotificationCreated(userId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.NOTIFICATION_CREATED, userId);
  }

  emitNotificationRead(userId: string): void {
    this.eventEmitter.emit(CacheInvalidationEvent.NOTIFICATION_READ, userId);
  }
}