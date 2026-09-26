# Qotes System Architecture & Data Design

**Version:** 1.0  
**Date:** September 25, 2026  
**Status:** Phase 1 - Production Ready  
**Document Owner:** K.V.N.Rajasekhar (Qotes Eng. Team head)

---

## 1. High-Level System Topology

### 1.1 Fullstack Monorepo Architecture

Qotes follows a monorepo structure with two primary applications:

```
qotes/
├── qotes-app/          # React Native/Expo mobile application
└── qotes-server/       # NestJS modular monolith backend
```

### 1.2 Communication Flow

```
┌─────────────────┐         HTTPS/REST          ┌──────────────────┐
│   qotes-app     │◄──────────────────────────►│   qotes-server   │
│  (React Native) │    JWT Auth + JSON API     │    (NestJS)       │
└─────────────────┘                            └────────┬─────────┘
                                                       │
                                          ┌────────────┴────────────┐
                                          │                         │
                                  ┌───────▼────────┐       ┌───────▼────────┐
                                  │    MongoDB     │       │     Redis      │
                                  │   (Primary)    │       │    (Cache)     │
                                  └────────────────┘       └────────┬────────┘
                                                                  │
                                                          ┌───────▼────────┐
                                                          │  Apache Kafka  │
                                                          │ (Event Stream)│
                                                          └────────────────┘
```

### 1.3 Component Responsibilities

**qotes-app (React Native/Expo)**

- Thin route wrappers using Expo Router (`app/(tabs)/*`)
- Server state management with TanStack Query (React Query)
- Client state with Zustand for UI-specific state
- Styling via NativeWind v4 (Tailwind CSS for React Native)
- MMKV for disk-persisted query cache hydration

**qotes-server (NestJS Modular Monolith)**

- RESTful API with JWT authentication
- Modular architecture with feature-based separation
- Write-behind pattern with Kafka for async persistence
- Redis caching layer with atomic operations
- BullMQ for background job processing

---

## 2. Data Layer Design (MongoDB via Mongoose)

### 2.1 QuoteSchema

**Purpose**: Core content entity storing quotes and requotes

```typescript
interface IQuote extends Document {
  text: string; // Quote content (10-500 chars)
  author: string; // Author name (default: 'Anonymous')
  creator?: mongoose.Types.ObjectId; // Reference to User who created
  category?: string; // Pre-defined category
  hashtags: string[]; // User-generated tags (max 5)
  likes: number; // Legacy like count (deprecated)
  saves: number; // Save/bookmark count
  requotes: number; // Requote count
  reactions: Map<string, number>; // 5-emotion reaction breakdown
  isRequote: boolean; // Flag for requoted content
  parentQuoteId?: mongoose.Types.ObjectId; // Original quote reference
  isHiddenBySystem: boolean; // Admin moderation flag
  createdAt: Date; // Creation timestamp
}
```

**Compound Indexes**:

```typescript
QuoteSchema.index({ creator: 1, createdAt: -1 }); // User quote timeline
QuoteSchema.index({ createdAt: -1 }); // Global chronological feed
QuoteSchema.index({ createdAt: -1, _id: -1 }); // Cursor pagination
QuoteSchema.index({ category: 1, createdAt: -1 }); // Category feeds
QuoteSchema.index({ isRequote: 1 }); // Requote filtering
QuoteSchema.index({ hashtags: 1, createdAt: -1 }); // Hashtag search
QuoteSchema.index(
  { creator: 1, parentQuoteId: 1 },
  { unique: true, partialFilterExpression: { isRequote: true } }
); // Prevent duplicate requotes
```

**Data Design Notes**:

- `reactions` stored as Map for O(1) lookup by emotion type
- Partial unique index ensures one requote per user per original quote
- Compound indexes optimized for common feed query patterns
- `isHiddenBySystem` for soft deletion/moderation without data loss

### 2.2 ReactionSchema

**Purpose**: Individual user reactions with 5-emotion matrix

```typescript
type ReactionType = 'like' | 'inspriring' | 'thoughtful' | 'realatable' | 'eye-opening';

interface IReaction extends Document {
  quote: mongoose.Types.ObjectId; // Reference to Quote
  user: mongoose.Types.ObjectId; // Reference to User
  type: ReactionType; // One of 5 emotion types
  createdAt: Date; // Reaction timestamp
}
```

**Compound Indexes**:

```typescript
ReactionSchema.index({ quote: 1, user: 1 }, { unique: true }); // Prevent duplicate reactions
ReactionSchema.index({ quote: 1, user: 1, createdAt: -1 }); // User reaction history
ReactionSchema.index({ quote: 1, type: 1, createdAt: -1 }); // Type-based pagination
ReactionSchema.index({ quote: 1, createdAt: -1 }); // Reaction timeline
```

**Data Design Notes**:

- Unique compound index enforces single reaction per user per quote
- Type enum maps to 5-emotion matrix (insightful, empowering, resonant, artistic, clap)
- Chronological indexes support reaction history and user lists

### 2.3 FollowSchema

**Purpose**: Social graph for following relationships

```typescript
interface IFollow extends Document {
  follower: mongoose.Types.ObjectId; // User who follows
  following: mongoose.Types.ObjectId; // User being followed
  createdAt: Date; // Follow timestamp
}
```

**Compound Indexes**:

```typescript
FollowSchema.index({ following: 1, _id: -1 }); // Follower lists
FollowSchema.index({ follower: 1, _id: -1 }); // Following lists
FollowSchema.index({ follower: 1, following: 1 }, { unique: true }); // Prevent duplicates
FollowSchema.index({ following: 1, createdAt: -1 }); // Follower timeline
FollowSchema.index({ follower: 1, createdAt: -1 }); // Following timeline
FollowSchema.index({ following: 1, createdAt: -1, _id: -1 }); // Cursor pagination
FollowSchema.index({ follower: 1, createdAt: -1, _id: -1 }); // Cursor pagination
```

**Data Design Notes**:

- Bidirectional indexes optimize both follower and following queries
- Unique constraint prevents duplicate follows
- Compound indexes with `_id` support efficient cursor pagination

### 2.4 CollectionSchema & CollectionItemSchema

**Purpose**: Normalized junction architecture for quote collections

**CollectionSchema** (Collection metadata):

```typescript
interface ICollection extends Document {
  owner: mongoose.Types.ObjectId; // Collection owner
  name: string; // Collection name
  description: string; // Collection description
  isPrivate: boolean; // Privacy flag
  isDefault: boolean; // Default bookmark collection
  createdAt: Date; // Creation timestamp
}
```

**CollectionSchema Indexes**:

```typescript
CollectionSchema.index({ owner: 1, createdAt: -1 }); // User collections
CollectionSchema.index({ owner: 1, isPrivate: 1, createdAt: -1 }); // Privacy filtering
CollectionSchema.index({ owner: 1, isDefault: 1 }); // Default collection lookup
```

**CollectionItemSchema** (Junction table):

```typescript
interface ICollectionItem extends Document {
  collectionId: mongoose.Types.ObjectId; // Reference to Collection
  quoteId: mongoose.Types.ObjectId; // Reference to Quote
  addedAt: Date; // Addition timestamp
}
```

**CollectionItemSchema Indexes**:

```typescript
CollectionItemSchema.index({ collectionId: 1, quoteId: 1 }, { unique: true }); // Prevent duplicates
CollectionItemSchema.index({ collectionId: 1, addedAt: -1 }); // Chronological items
```

**Data Design Notes**:

- Normalized junction pattern prevents unbounded array growth in Collection documents
- Unique constraint prevents duplicate quotes in same collection
- Separate models enable efficient queries without document size limits
- `isDefault` flag identifies auto-created bookmark collection for free tier

### 2.5 UserSchema

**Purpose**: User account and profile data

```typescript
interface IUserStats {
  followerCount: number; // Real-time follower count
  followingCount: number; // Real-time following count
  quoteCount: number; // Total quotes created
}

interface IUser extends Document {
  username: string; // Unique username
  email: string; // Unique email
  password: string; // Bcrypt hashed password
  firstName?: string; // Optional first name
  lastName?: string; // Optional last name
  bio: string; // User bio
  avatarUrl: string; // Profile avatar URL
  stats: IUserStats; // Embedded statistics
  isBanned: boolean; // Account ban flag
  createdAt: Date; // Account creation
  updatedAt: Date; // Last update
}
```

**UserSchema Indexes**:

```typescript
UserSchema.index({ username: 1, email: 1 }); // Login lookup
UserSchema.index({ createdAt: -1 }); // User discovery
UserSchema.index({ isBanned: 1, createdAt: -1 }); // Banned user filtering
UserSchema.index({ 'stats.followerCount': -1, createdAt: -1 }); // Trending users
UserSchema.index({ 'stats.quoteCount': -1, createdAt: -1 }); // Top creators
```

**Data Design Notes**:

- Embedded `stats` for frequently accessed user metrics
- Password field excluded from queries by default (`select: false`)
- Compound indexes support user discovery and ranking algorithms

---

## 3. Asynchronous Streaming & Write-Behind Pipeline (Apache Kafka)

### 3.1 Producer Flow

**Message Production Architecture**:

```typescript
// Reaction event producer example
interface ReactionEventPayload {
  userId: string;
  quoteId: string;
  type?: string;
  action: 'added' | 'updated' | 'removed';
}

// Producer publishes to topic with partition key
await producer.send({
  topic: 'reaction-events',
  messages: [
    {
      key: quoteId, // Partition key for per-quote ordering
      value: JSON.stringify(payload),
      timestamp: Date.now(),
    },
  ],
});
```

**Producer Configuration**:

```typescript
const kafka = new Kafka({
  clientId: 'qotes-server',
  brokers: process.env.KAFKA_BROKERS.split(','),
  ssl: { rejectUnauthorized: true, ca: [caCert] },
  sasl: {
    mechanism: 'scram-sha-256',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
  retry: { retries: 10, initialRetryTime: 300 },
});
```

### 3.2 Partition Key Strategy

**Partitioning Rules**:

- **Reaction Events**: `quoteId` as partition key ensures per-quote ordering
- **Auth Events**: `userId` as partition key for per-user event ordering
- **Quote Events**: `creator` as partition key for user-centric ordering

**Ordering Guarantees**:

- Events with same partition key processed in order within partition
- Cross-partition ordering not guaranteed (acceptable for most use cases)
- Consumer group ensures exactly-once processing per partition

### 3.3 Consumer Groups

**reaction-persistence-group**:

```typescript
const consumer = kafka.consumer({
  groupId: 'reaction-persistence-group',
});

await consumer.subscribe({
  topic: 'reaction-events',
  fromBeginning: false, // Start from latest offset
});
```

**Consumer Configuration**:

- **Auto-commit**: Disabled for manual offset control
- **Session Timeout**: 30 seconds
- **Heartbeat Interval**: 3 seconds
- **Max Poll Records**: 100 messages per poll

### 3.4 Idempotent Database Upserts

**Reaction Consumer Example**:

```typescript
await consumer.run({
  eachMessage: async ({ message }) => {
    const event: ReactionEventPayload = JSON.parse(message.value.toString());

    if (event.action === 'added' || event.action === 'updated') {
      // Idempotent upsert - safe to retry
      await Reaction.updateOne(
        { user: userObjectId, quote: quoteObjectId },
        { $set: { type: event.type } },
        { upsert: true }
      );
    } else if (event.action === 'removed') {
      await Reaction.deleteOne({
        user: userObjectId,
        quote: quoteObjectId,
      });
    }
  },
});
```

**Idempotency Patterns**:

- **Upsert Operations**: `updateOne` with `upsert: true` for create-or-update
- **Delete Operations**: Idempotent by nature (delete non-existent is safe)
- **Unique Constraints**: Database-level enforcement prevents duplicates

### 3.5 Dead Letter Queue (DLQ) Topology

**DLQ Structure**:

```
reaction-events          (Main topic)
└── reaction-events-dlq  (Dead Letter Queue)

auth-events              (Main topic)
└── auth-events-dlq      (Dead Letter Queue)
```

**DLQ Configuration**:

```typescript
// Topic naming convention: {topic-name}-dlq
const DLQ_TOPICS = {
  'reaction-events': 'reaction-events-dlq',
  'auth-events': 'auth-events-dlq',
};
```

**Retry Replay Policies**:

```typescript
// Exponential backoff with max 3 attempts
const retryPolicy = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

// Failed messages routed to DLQ after max retries
await producer.send({
  topic: `${originalTopic}-dlq`,
  messages: [
    {
      key: originalKey,
      value: JSON.stringify({
        originalMessage,
        error: error.message,
        retryCount,
        failedAt: new Date().toISOString(),
      }),
    },
  ],
});
```

**DLQ Monitoring**:

- Dedicated consumer for DLQ topics
- Alerting on DLQ message accumulation
- Manual replay mechanism for corrected messages
- Automatic message expiry after 7 days

---

## 4. Caching & Background Queues (Redis & BullMQ)

### 4.1 Redis Layer

#### 4.1.1 Atomic Lua Scripts

**Reaction Counter Update Script**:

```lua
-- KEYS[1]: reaction breakdown hash key
-- KEYS[2]: reaction total counter key
-- ARGV[1]: new reaction type
-- ARGV[2]: delta (+1 or -1)
-- ARGV[3]: old reaction type (or "none")

local breakdownKey = KEYS[1]
local totalKey = KEYS[2]
local type = ARGV[1]
local delta = tonumber(ARGV[2])
local oldType = ARGV[3]

if oldType ~= "none" then
  redis.call("HINCRBY", breakdownKey, oldType, -1)
else
  redis.call("INCRBY", totalKey, delta)
end
return redis.call("HINCRBY", breakdownKey, type, delta)
```

**Sliding Window Rate Limiter Script**:

```lua
-- KEYS[1]: burst window sorted set key
-- KEYS[2]: sustained window sorted set key
-- ARGV[1]: current timestamp
-- ARGV[2]: burst window duration (ms)
-- ARGV[3]: burst limit
-- ARGV[4]: sustained window duration (ms)
-- ARGV[5]: sustained limit

local now = tonumber(ARGV[1])

-- Clean expired entries from burst window
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - ARGV[2])
local burstCount = redis.call('ZCARD', KEYS[1])
if burstCount >= tonumber(ARGV[3]) then return 0 end

-- Clean expired entries from sustained window
redis.call('ZREMRANGEBYSCORE', KEYS[2], 0, now - ARGV[4])
local sustainedCount = redis.call('ZCARD', KEYS[2])
if sustainedCount >= tonumber(ARGV[5]) then return 0 end

-- Record event in both windows
redis.call('ZADD', KEYS[1], now, now)
redis.call('ZADD', KEYS[2], now, now)

-- Set expiry for auto cleanup
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ARGV[4])
return 1
```

#### 4.1.2 Key Naming Convention

```typescript
const RedisKeys = {
  // Reaction counters
  reactionBreakdown: (id: string) => `qotes:reaction:breakdown:${id}`,
  reactionTotal: (id: string) => `qotes:reaction:total:${id}`,
  reactionState: (userId: string, quoteId: string) => `qotes:reaction:state:${userId}:${quoteId}`,

  // Rate limiting
  rateLimitBurst: (userId: string) => `qotes:ratelimit:burst:${userId}`,
  rateLimitSustain: (userId: string) => `qotes:ratelimit:sustain:${userId}`,

  // Social graph
  userFollowing: (userId: string) => `qotes:social:following:${userId}`,

  // User data
  user: (userId: string) => `qotes:user:${userId}`,
  userProfile: (userId: string) => `qotes:user:profile:${userId}`,
  userStats: (userId: string) => `qotes:user:stats:${userId}`,
  userFollowers: (userId: string) => `qotes:user:followers:${userId}`,

  // Quote data
  quote: (quoteId: string) => `qotes:quote:${quoteId}`,
  quoteStats: (quoteId: string) => `qotes:quote:stats:${quoteId}`,

  // Feed caching
  globalFeed: (page: number) => `qotes:feed:global:${page}`,
  followingFeed: (userId: string, page: number) => `qotes:feed:following:${userId}:${page}`,
  discoverFeed: (page: number) => `qotes:feed:discover:${page}`,

  // Collections
  userCollections: (userId: string) => `qotes:collections:user:${userId}`,
  collectionItems: (collectionId: string) => `qotes:collections:items:${collectionId}`,

  // Notifications
  notificationCount: (userId: string) => `qotes:notifications:count:${userId}`,
  recentNotifications: (userId: string) => `qotes:notifications:recent:${userId}`,
};
```

#### 4.1.3 Data Structures

**Reaction Breakdown (Hash)**:

```
qotes:reaction:breakdown:quote123
{
  "insightful": 45,
  "empowering": 23,
  "resonant": 67,
  "artistic": 12,
  "clap": 8
}
```

**User Following Set (Set)**:

```
qotes:social:following:user456
{
  "user789",
  "user101",
  "user234"
}
```

**Rate Limit Windows (Sorted Sets)**:

```
qotes:ratelimit:burst:user456
{
  1727284800000: 1727284800000,
  1727284860000: 1727284860000
}

qotes:ratelimit:sustain:user456
{
  1727284800000: 1727284800000,
  1727284860000: 1727284860000,
  1727284920000: 1727284920000
}
```

### 4.2 Read-Repair Strategy

**Cache-Aside Pattern with Lazy Hydration**:

```typescript
async function getReactionBreakdown(quoteId: string): Promise<ReactionBreakdown> {
  // Try cache first
  const [breakdown, total] = await Promise.all([
    cacheHGetAll(RedisKeys.reactionBreakdown(quoteId)),
    cacheGet(RedisKeys.reactionTotal(quoteId)),
  ]);

  // Cache hit - return cached data
  if (total && Object.keys(breakdown).length > 0) {
    return {
      breakdown: breakdown as Record<string, number>,
      total: Number(total),
    };
  }

  // Cache miss - read from database (read-repair)
  const agg = await Reaction.aggregate([
    { $match: { quoteId: new mongoose.Types.ObjectId(quoteId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  // Reconstruct breakdown
  const repairedBreakdown: Record<string, number> = {};
  let repairedTotal = 0;
  agg.forEach((r: any) => {
    repairedBreakdown[r._id] = r.count;
    repairedTotal += r.count;
  });

  // Hydrate cache
  if (repairedTotal > 0) {
    await redis
      .pipeline()
      .hmset(RedisKeys.reactionBreakdown(quoteId), repairedBreakdown)
      .set(RedisKeys.reactionTotal(quoteId), repairedTotal)
      .expire(RedisKeys.reactionBreakdown(quoteId), 3600)
      .expire(RedisKeys.reactionTotal(quoteId), 3600)
      .exec();
  }

  return { breakdown: repairedBreakdown, total: repairedTotal };
}
```

**Read-Repair Benefits**:

- Fast-path cache reads for hot data (sub-5ms latency)
- Automatic cache hydration on cold data
- Database as single source of truth
- Resilient to cache failures (fallback to DB)

### 4.3 BullMQ Queues

#### 4.3.1 Queue Architecture

**ImageGeneration Queue**:

```typescript
// Canvas rendering for quote images
const imageQueue = new Queue('image-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Job payload
interface ImageGenerationJob {
  quoteId: string;
  text: string;
  author: string;
  style: 'minimal' | 'elegant' | 'bold';
  userId: string;
}
```

**QuoteNotifications Queue**:

```typescript
// Rate-limited push/email notifications
const notificationQueue = new Queue('quote-notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 500,
    removeOnFail: 100,
  },
});

// Job payload
interface NotificationJob {
  type: 'reaction' | 'follow' | 'requote' | 'mention';
  recipientId: string;
  actorId: string;
  quoteId?: string;
  metadata?: Record<string, unknown>;
}
```

**ScheduledCron Queue**:

```typescript
// Daily quotes and maintenance tasks
const cronQueue = new Queue('scheduled-cron', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

// Recurring jobs
await cronQueue.add(
  'daily-quote',
  {},
  {
    repeat: { pattern: '0 9 * * *' }, // 9 AM daily
  }
);

await cronQueue.add(
  'cache-cleanup',
  {},
  {
    repeat: { pattern: '0 3 * * *' }, // 3 AM daily
  }
);
```

#### 4.3.2 Worker Configuration

**Reaction Worker**:

```typescript
const reactionWorker = new Worker(
  'reaction-persistence',
  async job => {
    const { userId, quoteId, type, action } = job.data;

    if (action === 'added' || action === 'updated') {
      await Reaction.updateOne(
        { user: userId, quote: quoteId },
        { $set: { type } },
        { upsert: true }
      );
    } else if (action === 'removed') {
      await Reaction.deleteOne({ user: userId, quote: quoteId });
    }
  },
  {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 60000, // Rate limit worker processing
    },
  }
);
```

**Image Generation Worker**:

```typescript
const imageWorker = new Worker(
  'image-generation',
  async job => {
    const { quoteId, text, author, style } = job.data;

    // Generate canvas image
    const canvas = createQuoteCanvas(text, author, style);
    const imageUrl = await uploadToCloudinary(canvas);

    // Update quote with generated image
    await Quote.findByIdAndUpdate(quoteId, { imageUrl });

    return { imageUrl };
  },
  {
    connection: redis,
    concurrency: 5, // Limited due to CPU-intensive rendering
  }
);
```

---

## 5. Frontend Client Architecture

### 5.1 Expo Router Structure

**Route Organization**:

```
app/
├── _layout.tsx              # Root layout with navigation
├── (tabs)/
│   ├── _layout.tsx          # Tab navigation layout
│   ├── index.tsx            # Global feed (delegates to feature)
│   ├── following.tsx        # Following feed (delegates to feature)
│   ├── discover.tsx         # Discover feed (delegates to feature)
│   ├── profile.tsx          # User profile (delegates to feature)
│   └── notifications.tsx    # Notifications (delegates to feature)
├── auth/
│   ├── login.tsx            # Login screen
│   ├── signup.tsx           # Registration screen
│   └── forgot-password.tsx  # Password recovery
└── quote/
    └── [id].tsx             # Quote detail screen
```

**Thin Route Wrapper Pattern**:

```typescript
// app/(tabs)/index.tsx
import { GlobalFeedScreen } from '@/features/feeds/components/GlobalFeedScreen';

export default function GlobalFeedRoute() {
  return <GlobalFeedScreen />;
}
```

### 5.2 Server State Caching (TanStack Query)

**Query Configuration**:

```typescript
// React Query setup with MMKV persistence
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});

// MMKV hydration for offline support
const state = loadFromMMKV();
if (state) {
  queryClient.setQueryData(state.queries);
}
```

**Infinite Query for Feeds**:

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['global-feed'],
  queryFn: ({ pageParam = null }) => fetchGlobalFeed(pageParam),
  getNextPageParam: lastPage => lastPage.nextCursor || undefined,
  initialPageParam: null,
});
```

### 5.3 Client State (Zustand)

**Lightweight State Management**:

```typescript
// stores/ui.store.ts
interface UIState {
  activeTab: 'global' | 'following' | 'discover';
  theme: 'light' | 'dark';
  isReactionSheetOpen: boolean;
  setActiveTab: (tab: string) => void;
  toggleReactionSheet: () => void;
}

const useUIStore = create<UIState>(set => ({
  activeTab: 'global',
  theme: 'light',
  isReactionSheetOpen: false,
  setActiveTab: tab => set({ activeTab: tab }),
  toggleReactionSheet: () =>
    set(state => ({
      isReactionSheetOpen: !state.isReactionSheetOpen,
    })),
}));
```

### 5.4 Styling (NativeWind v4)

**Token System**:

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Monochrome palette
        primary: '#1a1a1a',
        secondary: '#4a4a4a',
        accent: '#7a7a7a',
        background: '#ffffff',
        surface: '#f5f5f5',
        // Reaction colors
        insightful: '#3b82f6',
        empowering: '#10b981',
        resonant: '#f59e0b',
        artistic: '#8b5cf6',
        clap: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
    },
  },
};
```

**Component Styling**:

```typescript
// components/QuoteCard.tsx
import { View, Text } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

export function QuoteCard({ quote }) {
  return (
    <StyledView className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <StyledText className="text-gray-900 text-lg font-serif leading-relaxed">
        {quote.text}
      </StyledText>
      <StyledText className="text-gray-500 text-sm mt-2">
        — {quote.author}
      </StyledText>
    </StyledView>
  );
}
```

---

## 6. NestJS Backend Architecture

### 6.1 Modular Structure

```
src/
├── main.ts                      # Application entry point
├── app.module.ts                # Root module
├── app.ts                       # NestJS application factory
├── config/                      # Configuration modules
│   ├── database.ts             # MongoDB connection
│   ├── cloudinary.config.ts    # Media storage config
│   └── nodemailer.config.ts     # Email service config
├── modules/                     # Feature modules
│   ├── auth/                   # Authentication
│   ├── users/                  # User management
│   ├── quotes/                 # Quote CRUD
│   ├── reactions/              # Reaction system
│   ├── feeds/                  # Feed generation
│   ├── collections/            # Collection management
│   ├── comments/               # Comment system
│   ├── notifications/          # Notification system
│   ├── preferences/           # User preferences
│   ├── search/                 # Search functionality
│   ├── safety/                 # Content moderation
│   ├── admin/                  # Admin operations
│   └── system/                 # System health
├── infrastructure/              # Infrastructure services
│   ├── cache/                  # Redis caching
│   ├── kafka/                  # Event streaming
│   ├── mailer/                 # Email services
│   └── media/                  # Media handling
├── models/                      # Mongoose schemas
├── shared/                      # Shared utilities
│   ├── decorators/             # Custom decorators
│   ├── filters/                # Exception filters
│   ├── guards/                 # Auth guards
│   ├── interceptors/           # Response interceptors
│   ├── interfaces/             # TypeScript interfaces
│   ├── queues/                 # BullMQ queues
│   └── utils/                  # Utility functions
└── workers/                     # Background workers
    ├── reaction.worker.ts      # Reaction persistence
    ├── imageGeneration.worker.ts # Image rendering
    ├── notification.worker.ts  # Notification delivery
    └── cron.worker.ts          # Scheduled tasks
```

### 6.2 Dependency Injection Pattern

**Module Dependencies**:

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Quote', schema: QuoteSchema }]),
    CacheModule,
    KafkaModule,
  ],
  providers: [QuotesService],
  controllers: [QuotesController],
  exports: [QuotesService],
})
export class QuotesModule {}
```

**Service Injection**:

```typescript
@Injectable()
export class QuotesService {
  constructor(
    @InjectModel('Quote') private quoteModel: Model<IQuote>,
    private cacheService: CacheManagerService,
    private kafkaProducer: KafkaProducer
  ) {}
}
```

### 6.3 Interceptor Pattern

**Response Interceptor**:

```typescript
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        statusCode: context.switchToHttp().getResponse().statusCode,
        message: data.message || 'Success',
        data: data.data || data,
        meta: data.meta || undefined,
      }))
    );
  }
}
```

### 6.4 Guard Pattern

**JWT Authentication Guard**:

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }
}
```

---

## 7. Performance Optimization Strategies

### 7.1 Database Optimization

**Index Strategy**:

- Compound indexes for common query patterns
- Partial indexes for filtered queries
- TTL indexes for temporary data
- Index monitoring and maintenance

**Query Optimization**:

- Projection to limit returned fields
- Lean queries for read-only operations
- Aggregation pipeline optimization
- Connection pooling configuration

### 7.2 Caching Strategy

**Multi-Level Caching**:

1. **L1 Cache**: In-memory (application level)
2. **L2 Cache**: Redis (distributed)
3. **L3 Cache**: CDN (for static assets)

**Cache Invalidation**:

- Time-based expiration (TTL)
- Event-based invalidation (Kafka events)
- Manual invalidation (admin operations)
- Cache warming strategies

### 7.3 API Optimization

**Response Optimization**:

- Compression (gzip)
- Field selection (GraphQL-like pattern)
- Pagination (cursor-based)
- Batch operations

**Request Optimization**:

- HTTP/2 multiplexing
- Connection keep-alive
- Request batching
- Debouncing/throttling

---

## 8. Security Architecture

### 8.1 Authentication Flow

```
Client → POST /auth/login
  ↓
Server validates credentials
  ↓
Server generates JWT access token (15min expiry)
  ↓
Server generates refresh token (7 day expiry)
  ↓
Refresh token stored in Redis
  ↓
Tokens returned to client
  ↓
Client stores access token in memory
  ↓
Client stores refresh token in httpOnly cookie
```

### 8.2 Token Rotation

**Refresh Token Flow**:

```typescript
async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  // Validate refresh token
  const payload = await this.validateRefreshToken(refreshToken);

  // Check if token is blacklisted
  const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
  if (isBlacklisted) {
    throw new UnauthorizedException('Token revoked');
  }

  // Generate new access token
  const newAccessToken = this.jwtService.sign({
    userId: payload.userId,
    username: payload.username,
  }, { expiresIn: '15m' });

  // Rotate refresh token
  await this.deleteRefreshToken(refreshToken);
  const newRefreshToken = await this.generateRefreshToken(payload.userId);

  return { accessToken: newAccessToken };
}
```

### 8.3 Rate Limiting

**Sliding Window Implementation**:

```typescript
@Throttle({
  default: {
    limit: 100,      // 100 requests
    ttl: 60000,      // per 60 seconds
  },
  custom: {
    auth: {
      limit: 5,      // 5 requests
      ttl: 60000,    // per 60 seconds (strict)
    },
  },
})
async sensitiveOperation() {
  // Rate-limited operation
}
```

---

## 9. Monitoring & Observability

### 9.1 Health Checks

**Liveness Probe** (`/health`):

```typescript
@Get('health')
getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

**Readiness Probe** (`/ready`):

```typescript
@Get('ready')
async getReady() {
  const checks = {
    database: await this.checkDatabase(),
    redis: await this.checkRedis(),
    kafka: await this.checkKafka(),
  };

  const isReady = Object.values(checks).every(status => status === 'ok');

  return {
    status: isReady ? 'ready' : 'not-ready',
    checks,
  };
}
```

### 9.2 Metrics Collection

**Prometheus Metrics**:

```typescript
// Custom metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});
```

### 9.3 Logging Strategy

**Structured Logging**:

```typescript
logger.info('User login successful', {
  userId: user._id,
  username: user.username,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  timestamp: new Date().toISOString(),
});
```

**Log Levels**:

- **ERROR**: Critical errors requiring immediate attention
- **WARN**: Warning conditions that should be investigated
- **INFO**: Normal operational information
- **DEBUG**: Detailed debugging information

---

## 10. Deployment Architecture

### 10.1 Container Strategy

**Docker Multi-Stage Build**:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 10.2 Infrastructure Components

**Production Stack**:

- **Application**: NestJS on Node.js 20+
- **Database**: MongoDB replica set (3 nodes)
- **Cache**: Redis Cluster (6 nodes, 3 masters + 3 replicas)
- **Message Broker**: Apache Kafka (3 brokers)
- **Load Balancer**: NGINX/HAProxy
- **CDN**: CloudFront/Cloudflare for static assets
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

---

**Document Control**

- **Last Updated**: September 25, 2026
- **Next Review**: November/December, 2026
- **Approved By**: K.V.N. Rajasekhar (Qotes Eng. Team Head)
- **Change History**: Initial version for Phase 1 production release
