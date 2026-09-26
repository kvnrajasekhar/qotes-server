# Qotes Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** September 25, 2026  
**Status:** Phase 1 - Production Ready  
**Document Owner:** K.V.N Rajasekhar (Qotes Eng. Team Head)

---

## 1. Product Vision & Value Proposition

### 1.1 Vision Statement

Qotes is an intellectual, high-signal, text-first quote-sharing platform designed to curate and distribute meaningful thoughts, insights, and wisdom. Unlike traditional social media platforms dominated by visual content, Qotes focuses exclusively on the power of words to inspire, educate, and connect people through shared human experiences.

### 1.2 Core Value Proposition

- **Text-Only Content Policy**: Zero tolerance for image/video media posts. Only text-based quotes are permitted, ensuring focus on intellectual content rather than visual appeal.
- **Profile Avatars Only**: The only visual media allowed in the platform are user profile avatars, maintaining personal identity without compromising the text-first philosophy.
- **High-Signal Curation**: Platform mechanics designed to surface quality content through sophisticated emotional reactions rather than generic likes.
- **Intellectual Discovery**: Users discover quotes through meaning-driven exploration rather than algorithmic visual engagement.

### 1.3 Target Market

- **Primary**: Intellectual readers, writers, and thought leaders seeking meaningful content
- **Secondary**: Students, researchers, and professionals looking for inspiration and knowledge sharing
- **Tertiary**: Quote collectors and curators building personal libraries of wisdom

---

## 2. User Personas & Core Journeys

### 2.1 The Reader (Passive Consumer)

**Profile**: Casual user who consumes content without active contribution

**Core Journey**:

1. Onboards with minimal friction (email/password or social login)
2. Browses global feed for high-signal quotes
3. Engages with content through 5-emotion reaction matrix
4. Discovers new authors and categories through exploration
5. Optionally bookmarks quotes to personal collection (Free Tier: single flat list)

**Key Pain Points Addressed**:

- Overwhelmed by visual noise in traditional social media
- Difficulty finding intellectually stimulating content
- Desire for distraction-free reading experience

### 2.2 The Writer/Curator (Active Contributor)

**Profile**: User who actively creates and shares quotes

**Core Journey**:

1. Creates original quotes or requotes existing content with attribution
2. Tags quotes with relevant categories and hashtags
3. Monitors engagement through detailed reaction breakdowns
4. Builds following through consistent quality contributions
5. Manages personal brand through profile curation

**Key Pain Points Addressed**:

- Lack of dedicated platforms for text-only intellectual content
- Difficulty reaching targeted audience interested in meaningful content
- Limited tools for tracking meaningful engagement metrics

### 2.3 The Power Collector (Premium User)

**Profile**: Heavy user who organizes and categorizes quotes extensively

**Core Journey**:

1. Upgrades to Premium Tier for advanced collection features
2. Creates multiple themed collections (e.g., "Philosophy", "Business Wisdom", "Daily Inspiration")
3. Organizes quotes with custom categorization and tagging
4. Shares collections with followers or keeps private
5. Uses advanced search and filtering across personal library

**Key Pain Points Addressed**:

- Limited bookmarking capabilities in free tier
- Need for sophisticated organization tools
- Desire for private curation spaces

---

## 3. Functional Domain Specifications

### 3.1 Content Integrity System

#### 3.1.1 Text Validation

- **Length Constraints**: Quotes must be between 10 and 500 characters
- **Character Set**: Unicode text support with profanity filtering
- **Duplicate Detection**: Near-duplicate detection using text similarity algorithms
- **Empty Content Prevention**: Mandatory text field validation on quote creation

#### 3.1.2 Profanity Screening

- **Real-time Filtering**: Blocked words and phrases rejected during submission
- **Contextual Analysis**: Distinguishes between legitimate usage and abuse
- **User Reporting**: Community-driven flagging for missed inappropriate content
- **Automated Moderation**: AI-assisted content review for borderline cases

#### 3.1.3 Author Attribution

- **Original Quotes**: Creator attribution with optional author field
- **Requotes**: Mandatory parent quote reference with original creator credit
- **Author Verification**: System verification of claimed authorship where possible
- **Attribution Chains**: Full requote history tracking for transparency

#### 3.1.4 Tag Taxonomy

- **Category System**: Pre-defined categories (Philosophy, Business, Literature, Science, etc.)
- **Hashtag Support**: User-generated hashtags for granular classification
- **Tag Validation**: Standardized hashtag format (alphanumeric with # prefix)
- **Tag Limits**: Maximum 5 hashtags per quote to prevent tag spam

### 3.2 The 5-Emotion Reaction Matrix

#### 3.2.1 Emotional Vectors

Qotes replaces generic "likes" with precise emotional reactions:

1. **Insightful**: Indicates intellectual value, new perspectives, or educational content
2. **Empowering**: Suggests motivation, inspiration, or personal strength
3. **Resonant**: Expresses personal connection, relatability, or emotional alignment
4. **Artistic**: Appreciation for literary quality, poetry, or aesthetic wording
5. **Clap**: General appreciation or applause (fallback for undefined positive sentiment)

#### 3.2.2 Reaction Mechanics

- **Single Selection**: Users can only apply one reaction type per quote
- **Toggle Behavior**: Clicking same reaction removes it; clicking different reaction switches
- **Real-time Updates**: Reaction counts updated via Redis with sub-5ms latency
- **Breakdown Display**: Each quote shows count distribution across all 5 reaction types

#### 3.2.3 Technical Implementation

- **Reaction Types**: Stored as enum: `like`, `inspriring`, `thoughtful`, `realatable`, `eye-opening`
- **Atomic Counters**: Redis-based counters with Lua scripts for thread-safe increments
- **Read-Repair Strategy**: Cache misses trigger MongoDB aggregation for counter hydration
- **Idempotent Operations**: Reaction toggles designed for safe retry in distributed systems

### 3.3 Freemium Bookmarks vs. Collections Hierarchy

#### 3.3.1 Free Tier: Single Flat Bookmark List

- **Default Collection**: Auto-created "Bookmarks" collection for all new users
- **Flat Structure**: No sub-collections or folder hierarchy
- **Unlimited Items**: No limit on number of quotes in default collection
- **Basic Organization**: Chronological ordering only
- **Privacy**: Default collection is private by default

#### 3.3.2 Premium Tier: Multi-Folder Categorized Collections

- **Multiple Collections**: Unlimited collection creation with custom names
- **Hierarchical Organization**: Collections can be grouped by theme, topic, or purpose
- **Advanced Metadata**: Custom descriptions, cover images, and privacy settings per collection
- **Bulk Operations**: Move quotes between collections, batch organization tools
- **Sharing Features**: Public collection links, collaborative collections (future)
- **Search & Filter**: Full-text search across personal collections with advanced filters

#### 3.3.3 Technical Architecture

- **Normalized Schema**: Separate `Collection` and `CollectionItem` models to prevent unbounded array growth
- **Junction Pattern**: `CollectionItem` as many-to-many relationship table
- **Compound Indexes**: Unique constraint on `{ collectionId: 1, quoteId: 1 }` to prevent duplicates
- **Lazy Loading**: Collection items loaded on-demand with cursor pagination

### 3.4 Social Discovery System

#### 3.4.1 Infinite Feeds

- **Global Feed**: Trending quotes across entire platform with time-decay algorithm
- **Following Feed**: Quotes from followed users with friends-first sorting
- **Discover Feed**: Algorithmic recommendations based on reaction history and category preferences
- **User Feed**: Individual user's quote history with pagination

#### 3.4.2 Following Graph

- **Bidirectional Relationships**: User can follow any other user (no reciprocal requirement)
- **Follow Limits**: Maximum 5,000 following per user to prevent spam
- **Follower Counting**: Real-time follower/following counts via Redis sets
- **Follow Notifications**: Real-time alerts for new followers via WebSocket

#### 3.4.3 User Blocking

- **Block Functionality**: Users can block others to prevent content visibility
- **Bidirectional Blocking**: Blocked users cannot see blocker's content or interact
- **Block Persistence**: Blocks stored in database with Redis caching for fast lookup
- **Feed Filtering**: Blocked users' quotes automatically filtered from all feeds

#### 3.4.4 Soft Filtering ("Not Interested" Preferences)

- **Preference System**: Users can mark categories, hashtags, or authors as "not interested"
- **Feed Personalization**: Global feed automatically filters out dispreferred content
- **Preference Storage**: User preferences stored in `UserContentPreference` model
- **Gradual Filtering**: Soft filtering reduces visibility rather than hard removal

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Performance Requirements

#### 4.1.1 Cold-Boot Performance

- **Target**: <500ms to paint cached feed on application launch
- **Implementation**: Redis-cached feed fragments with pre-computed pagination
- **Measurement**: Time from app launch to first content render on cached data

#### 4.1.2 Counter Read Latencies

- **Target**: Sub-5ms latency for reaction counter reads
- **Implementation**: Redis-based atomic counters with Lua scripts
- **Measurement**: P95 latency for reaction breakdown API endpoints

#### 4.1.3 Write Performance

- **Target**: <100ms for quote creation and reaction toggles
- **Implementation**: Write-behind pattern with Kafka for asynchronous persistence
- **Measurement**: P99 latency for write operations acknowledged to client

### 4.2 Availability & Reliability

#### 4.2.1 Write-Behind Resilience

- **Kafka Buffering**: All write operations buffered in Kafka topics before persistence
- **Consumer Groups**: Multiple consumer instances for fault tolerance
- **Dead Letter Queue**: Failed messages routed to DLQ for manual inspection
- **Retry Policies**: Exponential backoff with max 3 retry attempts

#### 4.2.2 Zero Data Loss

- **Database Downtime Resilience**: Kafka buffers persist during MongoDB outages
- **Redis Persistence**: Redis configured with AOF persistence for cache durability
- **Transaction Safety**: Critical operations use MongoDB transactions for atomicity
- **Backup Strategy**: Daily MongoDB snapshots with point-in-time recovery

### 4.3 Scalability Requirements

#### 4.3.1 Horizontal Scaling

- **Stateless API**: NestJS application designed for horizontal scaling
- **Connection Pooling**: Database connection pooling optimized for high concurrency
- **Cache Sharding**: Redis Cluster support for horizontal cache scaling
- **Kafka Partitioning**: Topic partitioning strategy for parallel consumer processing

#### 4.3.2 Vertical Scaling

- **Resource Optimization**: Memory-efficient data structures and algorithms
- **Query Optimization**: Compound indexes for common query patterns
- **Lazy Loading**: Pagination and lazy loading to prevent memory bloat

### 4.4 Security Requirements

#### 4.4.1 Authentication & Authorization

- **JWT Tokens**: Short-lived access tokens (15min) with refresh token rotation
- **Token Storage**: Refresh tokens stored in Redis with rotation on each use
- **Rate Limiting**: Per-IP and per-user rate limiting on all endpoints
- **Password Security**: bcrypt hashing with cost factor 10

#### 4.4.2 Data Protection

- **Input Validation**: Comprehensive input sanitization and validation
- **SQL Injection Prevention**: Parameterized queries via Mongoose
- **XSS Protection**: Content sanitization and output encoding
- **CSRF Protection**: Token-based CSRF protection for state-changing operations

### 4.5 Observability Requirements

#### 4.5.1 Monitoring

- **Health Endpoints**: `/health` for liveness, `/ready` for readiness checks
- **Metrics**: Prometheus-compatible metrics endpoint at `/metrics`
- **Logging**: Structured JSON logging with Winston and daily rotation
- **Tracing**: Distributed tracing for request flow across services

#### 4.5.2 Alerting

- **Error Rate Monitoring**: Alert on error rate >1% for >5 minutes
- **Latency Monitoring**: Alert on P95 latency >1s for critical endpoints
- **Resource Monitoring**: Alert on CPU >80%, Memory >85%, Disk >90%
- **Queue Depth**: Alert on Kafka consumer lag >1000 messages

---

## 5. Explicit Out-of-Scope (Phase 1)

### 5.1 Advanced ML Features

- **Vector Recommendation Models**: Heavy ML-based recommendation systems
- **Content Embeddings**: Vector similarity search for quote recommendations
- **Sentiment Analysis**: Advanced NLP for automated content classification
- **Image Recognition**: Any image processing or computer vision features

### 5.2 Database Architecture

- **Polyglot Persistence**: Transition to relational or graph databases
- **Multi-Database Transactions**: Cross-database transaction management
- **Database Sharding**: Manual sharding strategies or custom partitioning

### 5.3 Content Types

- **Audio Quotes**: Voice recordings or audio content
- **Video Content**: Any video-based quote sharing
- **Mixed Media**: Combination of text with other media types
- **Interactive Content**: Polls, quizzes, or interactive quote formats

### 5.4 Social Features

- **Group Chats**: Real-time messaging between users
- **Live Streaming**: Real-time content broadcasting
- **Events Management**: Event creation and attendance tracking
- **Marketplace**: Monetization features or paid content access

### 5.5 Advanced Analytics

- **A/B Testing Framework**: Built-in experimentation platform
- **Advanced User Analytics**: Detailed behavioral analytics dashboards
- **Content Performance Analytics**: Deep analytics for content creators
- **Export Features**: Data export or API access for third-party tools

---

## 6. Success Metrics & KPIs

### 6.1 User Engagement

- **Daily Active Users (DAU)**: Target ~10,000 by end of Phase 1
- **Session Duration**: Target average 5+ minutes per session
- **Quote Creation Rate**: Target 0.5 quotes per DAU
- **Reaction Rate**: Target 2+ reactions per DAU

### 6.2 Content Quality

- **Report Rate**: Target <0.1% of quotes reported for policy violations
- **Reaction Diversity**: Target average 3+ different reaction types per quote
- **Requote Rate**: Target 15% of quotes are requotes with attribution
- **Collection Usage**: Target 40% of users create at least one collection

### 6.3 Technical Performance

- **API Availability**: Target 99.9% uptime
- **Feed Load Time**: Target <500ms P95 for cached feed loads
- **Reaction Latency**: Target <100ms P95 for reaction updates
- **Error Rate**: Target <0.1% error rate on all endpoints

---

## 7. Phase 1 Release Criteria

### 7.1 Must-Have Features

- [x] User authentication with JWT and refresh token rotation
- [x] Quote creation with text validation and author attribution
- [x] 5-emotion reaction matrix with real-time updates
- [x] Basic bookmarking (single flat collection for free tier)
- [x] Global and following feeds with cursor pagination
- [x] User following graph with real-time counts
- [x] User blocking functionality
- [x] Basic content filtering and preferences
- [x] Redis caching with read-repair strategy
- [x] Kafka write-behind pipeline with DLQ
- [x] BullMQ background job processing
- [x] Health and readiness endpoints

### 7.2 Performance Criteria

- [x] Cold-boot feed load <500ms
- [x] Reaction counter reads <5ms
- [x] Write operations <100ms acknowledged
- [x] 99.9% API availability
- [x] Zero data loss during database downtime

### 7.3 Security Criteria

- [x] JWT authentication with refresh token rotation
- [x] Rate limiting on all endpoints
- [x] Input validation and sanitization
- [x] Password hashing with bcrypt
- [x] Token blacklisting on logout

---

## 8. Future Roadmap (Beyond Phase 1)

### 8.2 Phase 2: Enhanced Discovery

- ML-based recommendation engine
- Advanced search with semantic matching
- Trending topics and hashtags
- Content personalization algorithms

### 8.3 Phase 3: Premium Features

- Advanced collection management
- Collection sharing and collaboration
- Analytics dashboard for creators
- Export and backup features

### 8.4 Phase 4: Platform Expansion

- Web application
- Desktop applications
- API for third-party integrations
- Developer platform and SDKs

---

**Document Control**

- **Last Updated**: September 25, 2026
- **Next Review**: November/December, 2026
- **Approved By**: K.V.N.Rajasekhar (Qotes Eng. Team Head)
- **Change History**: Initial version for Phase 1 production release
