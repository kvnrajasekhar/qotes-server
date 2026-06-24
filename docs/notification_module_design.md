# Notification Module - Development Document

## 1. Overview

### 1.1 Purpose

The notification module provides real-time and persistent notification capabilities for the Qotes social media application. It enables users to receive timely updates about interactions with their content and social connections, enhancing user engagement and platform stickiness.

### 1.2 Why It Is Needed

- **User Engagement**: Real-time notifications keep users informed about interactions with their content
- **Social Connectivity**: Users are alerted when others follow them or mention them
- **Platform Retention**: Timely notifications encourage users to return to the platform
- **User Experience**: Centralized notification hub provides a clean, organized view of all activities
- **Scalability**: Designed to handle growth while remaining on free-tier infrastructure

### 1.3 Functional Requirements

- Create notifications for various user interactions (likes, comments, follows, mentions, etc.)
- Deliver real-time notifications to online users via WebSocket
- Store notification history for offline users
- Track read/unread status for each notification
- Provide unread notification count
- Support pagination for notification lists
- Mark individual notifications as read
- Mark all notifications as read in bulk
- Delete notifications (optional future feature)
- Support notification preferences (future enhancement)

### 1.4 Non-Functional Requirements

- **Performance**: Real-time delivery within 500ms for online users
- **Scalability**: Handle 10,000+ concurrent connections on free-tier infrastructure
- **Reliability**: 99.9% notification persistence (no lost notifications)
- **Security**: Prevent notification spoofing and unauthorized access
- **Privacy**: Users only receive notifications they are authorized to see
- **Resource Efficiency**: Minimal memory footprint for socket mappings
- **Database Optimization**: Efficient indexing for fast queries
- **Free-Tier Compatible**: No expensive infrastructure requirements

---

## 2. Notification Events

### 2.1 Like on Quote

**Trigger Source**: User likes a quote created by another user

**Recipient**: Quote creator (not the liker)

**Payload**:

```javascript
{
  type: 'LIKE_QUOTE',
  recipient: 'quoteCreatorId',
  sender: 'likerId',
  referenceId: 'quoteId',
  referenceType: 'Quote',
  message: 'John liked your quote',
  metadata: {
    quoteText: 'The quote text...',
    quoteAuthor: 'Original Author'
  }
}
```

**User Experience**:

- Real-time toast notification if online
- Badge count increment on notification bell
- Notification appears in notification center with quote preview

---

### 2.2 Comment on Quote

**Trigger Source**: User comments on a quote created by another user

**Recipient**: Quote creator

**Payload**:

```javascript
{
  type: 'COMMENT_QUOTE',
  recipient: 'quoteCreatorId',
  sender: 'commenterId',
  referenceId: 'commentId',
  referenceType: 'Comment',
  message: 'John commented on your quote',
  metadata: {
    quoteId: 'quoteId',
    commentText: 'Great quote!',
    quoteText: 'The quote text...'
  }
}
```

**User Experience**:

- Real-time notification with comment preview
- Click to navigate to quote with comment highlighted
- Notification shows commenter's avatar and name

---

### 2.3 Reply to Comment

**Trigger Source**: User replies to a comment

**Recipient**: Original comment author

**Payload**:

```javascript
{
  type: 'REPLY_COMMENT',
  recipient: 'originalCommentAuthorId',
  sender: 'replierId',
  referenceId: 'replyCommentId',
  referenceType: 'Comment',
  message: 'John replied to your comment',
  metadata: {
    quoteId: 'quoteId',
    parentCommentId: 'originalCommentId',
    replyText: 'I agree!',
    originalCommentText: 'Original comment...'
  }
}
```

**User Experience**:

- Threaded conversation awareness
- Direct link to comment thread
- Shows both original comment and reply preview

---

### 2.4 Follow User

**Trigger Source**: User follows another user

**Recipient**: User being followed

**Payload**:

```javascript
{
  type: 'FOLLOW_USER',
  recipient: 'followedUserId',
  sender: 'followerId',
  referenceId: 'followerId',
  referenceType: 'User',
  message: 'John started following you',
  metadata: {
    followerName: 'John Doe',
    followerUsername: '@johndoe',
    followerAvatar: 'avatarUrl'
  }
}
```

**User Experience**:

- Social connection alert
- Quick follow-back option
- Link to follower's profile

---

### 2.5 Mention User

**Trigger Source**: User mentions another user in a quote or comment

**Recipient**: Mentioned user

**Payload**:

```javascript
{
  type: 'MENTION_USER',
  recipient: 'mentionedUserId',
  sender: 'mentionerId',
  referenceId: 'quoteId' or 'commentId',
  referenceType: 'Quote' or 'Comment',
  message: 'John mentioned you in a quote',
  metadata: {
    quoteText: 'Check out what @username said...',
    commentText: '@username what do you think?',
    mentionContext: 'quote' or 'comment'
  }
}
```

**User Experience**:

- Highlighted mention in content
- Direct navigation to mention location
- Context of mention (quote or comment)

---

### 2.6 Repost/Share Quote

**Trigger Source**: User requotes another user's quote

**Recipient**: Original quote creator

**Payload**:

```javascript
{
  type: 'REQUOTE_QUOTE',
  recipient: 'originalQuoteCreatorId',
  sender: 'requoterId',
  referenceId: 'requotedQuoteId',
  referenceType: 'Quote',
  message: 'John requoted your quote',
  metadata: {
    originalQuoteId: 'originalQuoteId',
    originalQuoteText: 'The quote text...',
    requoterName: 'John Doe'
  }
}
```

**User Experience**:

- Content amplification awareness
- Shows who shared the content
- Link to both original and requoted versions

---

### 2.7 System Notification

**Trigger Source**: System-generated events

**Recipient**: Affected users

**Payload**:

```javascript
{
  type: 'SYSTEM',
  recipient: 'userId',
  sender: 'SYSTEM',
  referenceId: null,
  referenceType: 'System',
  message: 'Your account has been verified',
  metadata: {
    systemEvent: 'ACCOUNT_VERIFIED',
    actionRequired: false,
    priority: 'low'
  }
}
```

**User Experience**:

- Important system updates
- Account status changes
- Platform announcements

---

## 3. Architecture

### 3.1 High-Level Architecture

```mermaid
graph TD
    A[User Action] --> B[Express Controller]
    B --> C[Notification Service]
    C --> D[MongoDB]
    C --> E[Socket.IO Server]
    E --> F[Online Users]
    D --> G[Notification History]
    E --> H[Real-time Delivery]
    F --> I[Client UI Update]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#ffe1f5
    style D fill:#e1ffe1
    style E fill:#f5e1ff
    style I fill:#e1f5ff
```

**Flow Description**:

1. User performs action (like, comment, follow, etc.)
2. Express controller handles the HTTP request
3. Controller calls Notification Service to create notification
4. Notification Service saves to MongoDB for persistence
5. Notification Service checks if recipient is online via Socket.IO
6. If online, emits real-time notification event
7. Client receives event and updates UI
8. If offline, notification persists for retrieval on next login

---

### 3.2 Real-Time Flow

```mermaid
sequenceDiagram
    participant User
    participant Controller
    participant NotificationService
    participant MongoDB
    participant SocketIO
    participant RecipientClient

    User->>Controller: Like Quote
    Controller->>NotificationService: createNotification()
    NotificationService->>MongoDB: Save Notification
    MongoDB-->>NotificationService: Saved
    NotificationService->>SocketIO: isUserOnline(recipientId)?
    SocketIO-->>NotificationService: true
    NotificationService->>SocketIO: emit('notification:new', data)
    SocketIO->>RecipientClient: WebSocket Event
    RecipientClient->>RecipientClient: Update UI
    RecipientClient->>RecipientClient: Show Toast
    NotificationService-->>Controller: Success
    Controller-->>User: 200 OK
```

---

### 3.3 Offline Flow

```mermaid
sequenceDiagram
    participant User
    participant Controller
    participant NotificationService
    participant MongoDB
    participant SocketIO

    User->>Controller: Like Quote
    Controller->>NotificationService: createNotification()
    NotificationService->>MongoDB: Save Notification
    MongoDB-->>NotificationService: Saved
    NotificationService->>SocketIO: isUserOnline(recipientId)?
    SocketIO-->>NotificationService: false
    NotificationService->>NotificationService: Skip real-time delivery
    NotificationService-->>Controller: Success
    Controller-->>User: 200 OK

    Note over RecipientClient: Later - User Logs In
    RecipientClient->>Controller: GET /api/notifications
    Controller->>NotificationService: getNotifications()
    NotificationService->>MongoDB: Find Notifications
    MongoDB-->>NotificationService: Notifications
    NotificationService-->>Controller: Notifications
    Controller-->>RecipientClient: Notification List
```

---

### 3.4 Component Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[React/Vue Frontend]
        B[Socket.IO Client]
    end

    subgraph "API Layer"
        C[Notification Routes]
        D[Notification Controller]
    end

    subgraph "Service Layer"
        E[Notification Service]
    end

    subgraph "Data Layer"
        F[Notification Model]
        G[MongoDB]
    end

    subgraph "Real-Time Layer"
        H[Socket.IO Server]
        I[User-Socket Mapping]
    end

    subgraph "Infrastructure"
        J[Auth Middleware]
        K[Validation Middleware]
    end

    A --> C
    B --> H
    C --> D
    D --> E
    E --> F
    F --> G
    E --> H
    H --> I
    C --> J
    C --> K

    style A fill:#e1f5ff
    style E fill:#ffe1f5
    style F fill:#e1ffe1
    style H fill:#f5e1ff
```

---

## 4. Database Design

### 4.1 Notification Schema

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "LIKE_QUOTE",
      "COMMENT_QUOTE",
      "REPLY_COMMENT",
      "FOLLOW_USER",
      "MENTION_USER",
      "REQUOTE_QUOTE",
      "SYSTEM",
    ],
    index: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 200,
  },
  referenceId: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  referenceType: {
    type: String,
    enum: ["Quote", "Comment", "User", "System"],
    index: true,
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for common queries
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isDeleted: 1, createdAt: -1 });
NotificationSchema.index({ sender: 1, createdAt: -1 });

// TTL index for automatic cleanup (optional - 90 days)
NotificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 7776000, // 90 days in seconds
  },
);

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
```

### 4.2 Index Explanation

**Single Indexes**:

- `recipient`: Fast lookup of all notifications for a user
- `sender`: Track notifications sent by a user (for analytics/spam detection)
- `type`: Filter by notification type
- `referenceId`: Quick lookup of notifications related to specific content
- `referenceType`: Filter by content type
- `isRead`: Separate read/unread notifications
- `isDeleted`: Soft delete support
- `createdAt`: Time-based sorting and pagination

**Compound Indexes**:

- `recipient + createdAt`: Optimized for fetching user's notifications in chronological order
- `recipient + isRead + createdAt`: Optimized for fetching unread notifications
- `recipient + isDeleted + createdAt`: Exclude deleted notifications from main feed

**TTL Index**:

- Automatic cleanup of old notifications after 90 days
- Prevents database bloat
- Can be disabled or adjusted based on requirements

### 4.3 Schema Validation

- `recipient` and `sender` are required and indexed
- `type` is restricted to enum values
- `message` has maxlength to prevent excessively long notifications
- `referenceType` is restricted to valid content types
- `metadata` is flexible Map type for storing additional context

---

## 5. API Design

### 5.1 Get Notifications

**Endpoint**: `GET /api/notifications`

**Description**: Retrieve paginated list of notifications for authenticated user

**Authentication**: Required (JWT)

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)
- `unreadOnly` (optional): Filter unread only (default: false)

**Request Example**:

```bash
GET /api/notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "recipient": "507f1f77bcf86cd799439012",
        "sender": {
          "_id": "507f1f77bcf86cd799439013",
          "username": "johndoe",
          "name": "John Doe",
          "avatar": "https://example.com/avatar.jpg"
        },
        "type": "LIKE_QUOTE",
        "message": "John liked your quote",
        "referenceId": "507f1f77bcf86cd799439014",
        "referenceType": "Quote",
        "metadata": {
          "quoteText": "The only way to do great work...",
          "quoteAuthor": "Steve Jobs"
        },
        "isRead": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 20,
      "totalItems": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Error Response** (401):

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

---

### 5.2 Get Unread Count

**Endpoint**: `GET /api/notifications/unread-count`

**Description**: Get count of unread notifications for authenticated user

**Authentication**: Required (JWT)

**Request Example**:

```bash
GET /api/notifications/unread-count
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "unreadCount": 7
  }
}
```

**Error Response** (401):

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

---

### 5.3 Mark as Read

**Endpoint**: `PATCH /api/notifications/:id/read`

**Description**: Mark a specific notification as read

**Authentication**: Required (JWT)

**Path Parameters**:

- `id`: Notification ID

**Request Example**:

```bash
PATCH /api/notifications/507f1f77bcf86cd799439011/read
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "isRead": true,
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Error Response** (404):

```json
{
  "success": false,
  "message": "Notification not found",
  "error": "NOT_FOUND"
}
```

**Error Response** (403):

```json
{
  "success": false,
  "message": "You do not have permission to access this notification",
  "error": "FORBIDDEN"
}
```

---

### 5.4 Mark All as Read

**Endpoint**: `PATCH /api/notifications/read-all`

**Description**: Mark all notifications for authenticated user as read

**Authentication**: Required (JWT)

**Request Example**:

```bash
PATCH /api/notifications/read-all
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "modifiedCount": 15
  }
}
```

**Error Response** (401):

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

---

### 5.5 Delete Notification (Optional Future Feature)

**Endpoint**: `DELETE /api/notifications/:id`

**Description**: Soft delete a notification

**Authentication**: Required (JWT)

**Request Example**:

```bash
DELETE /api/notifications/507f1f77bcf86cd799439011
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "isDeleted": true
  }
}
```

---

## 6. Socket.IO Design

### 6.1 Connection Flow

```mermaid
sequenceDiagram
    participant Client
    participant SocketIO
    participant AuthMiddleware
    participant UserSocketMap

    Client->>SocketIO: connect()
    SocketIO->>AuthMiddleware: Validate JWT
    AuthMiddleware-->>SocketIO: User ID
    SocketIO->>UserSocketMap: register(userId, socketId)
    UserSocketMap-->>SocketIO: Registered
    SocketIO-->>Client: connected
    Client->>SocketIO: emit('register:user', userId)
    SocketIO->>UserSocketMap: updateMapping(userId, socketId)
    UserSocketMap-->>SocketIO: Updated
    SocketIO-->>Client: user:registered
```

### 6.2 Authentication

Socket.IO connections must be authenticated using JWT token sent during connection:

```javascript
// Client-side
const socket = io("http://localhost:3000", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  },
});

// Server-side middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});
```

### 6.3 User-to-Socket Mapping

Store mapping in memory (free-tier compatible):

```javascript
const userSocketMap = new Map();

// Register user
function registerUser(userId, socketId) {
  if (!userSocketMap.has(userId)) {
    userSocketMap.set(userId, new Set());
  }
  userSocketMap.get(userId).add(socketId);
}

// Unregister user
function unregisterUser(userId, socketId) {
  if (userSocketMap.has(userId)) {
    userSocketMap.get(userId).delete(socketId);
    if (userSocketMap.get(userId).size === 0) {
      userSocketMap.delete(userId);
    }
  }
}

// Check if user is online
function isUserOnline(userId) {
  return userSocketMap.has(userId) && userSocketMap.get(userId).size > 0;
}

// Get user's socket IDs
function getUserSocketIds(userId) {
  return userSocketMap.get(userId) || new Set();
}
```

### 6.4 Socket Events

#### notification:new

Emitted by server when a new notification is created for an online user.

**Payload**:

```javascript
{
  _id: "507f1f77bcf86cd799439011",
  recipient: "507f1f77bcf86cd799439012",
  sender: {
    _id: "507f1f77bcf86cd799439013",
    username: "johndoe",
    name: "John Doe",
    avatar: "https://example.com/avatar.jpg"
  },
  type: "LIKE_QUOTE",
  message: "John liked your quote",
  referenceId: "507f1f77bcf86cd799439014",
  referenceType: "Quote",
  metadata: {
    quoteText: "The only way to do great work...",
    quoteAuthor: "Steve Jobs"
  },
  isRead: false,
  createdAt: "2024-01-15T10:30:00.000Z"
}
```

**Client Handler**:

```javascript
socket.on("notification:new", (notification) => {
  // Update notification count badge
  updateNotificationBadge();

  // Show toast notification
  showToast(notification.message);

  // Add to notification list (prepend)
  addNotificationToList(notification);

  // Play sound (optional)
  playNotificationSound();
});
```

---

#### notification:read

Emitted by client when user marks a notification as read.

**Payload**:

```javascript
{
  notificationId: "507f1f77bcf86cd799439011";
}
```

**Server Handler**:

```javascript
socket.on("notification:read", async (data) => {
  const { notificationId } = data;
  await notificationService.markAsRead(notificationId, socket.userId);

  // Emit updated count to user
  const unreadCount = await notificationService.getUnreadCount(socket.userId);
  socket.emit("notification:count", { unreadCount });
});
```

---

#### notification:count

Emitted by server when unread count changes.

**Payload**:

```javascript
{
  unreadCount: 7;
}
```

**Client Handler**:

```javascript
socket.on("notification:count", (data) => {
  updateBadgeCount(data.unreadCount);
});
```

---

#### user:registered

Emitted by server after successful user registration.

**Payload**:

```javascript
{
  userId: "507f1f77bcf86cd799439012",
  socketId: "abc123"
}
```

---

### 6.5 Disconnect Handling

```javascript
socket.on("disconnect", () => {
  if (socket.userId) {
    unregisterUser(socket.userId, socket.id);
  }
});
```

---

## 7. Service Layer Design

### 7.1 NotificationService

**Location**: `src/modules/notifications/notification.service.js`

**Responsibilities**:

- Create and persist notifications
- Handle real-time delivery logic
- Manage read/unread state
- Provide notification retrieval with pagination
- Calculate unread counts
- Integrate with Socket.IO for real-time delivery

---

### 7.2 Service Methods

#### createNotification(data)

**Purpose**: Create a new notification and deliver it if recipient is online

**Parameters**:

```javascript
{
  recipient: string,      // User ID of notification recipient
  sender: string,         // User ID of notification sender
  type: string,           // Notification type enum
  message: string,        // Human-readable message
  referenceId?: string,   // ID of referenced content
  referenceType?: string, // Type of referenced content
  metadata?: object       // Additional context data
}
```

**Returns**: Created notification document

**Logic**:

1. Validate input data
2. Create notification document in MongoDB
3. Check if recipient is online via Socket.IO
4. If online, emit `notification:new` event
5. Return created notification

**Example**:

```javascript
const notification = await notificationService.createNotification({
  recipient: quote.creator,
  sender: req.user.userId,
  type: "LIKE_QUOTE",
  message: `${req.user.username} liked your quote`,
  referenceId: quote._id,
  referenceType: "Quote",
  metadata: {
    quoteText: quote.text,
    quoteAuthor: quote.author,
  },
});
```

---

#### sendRealtimeNotification(recipientId, notification)

**Purpose**: Emit notification to online user via Socket.IO

**Parameters**:

- `recipientId`: User ID of recipient
- `notification`: Notification document

**Returns**: Boolean indicating if delivery was attempted

**Logic**:

1. Check if user is online using user-socket map
2. If online, get all socket IDs for user
3. Emit `notification:new` event to all sockets
4. Return true if emitted, false if offline

---

#### getNotifications(userId, options)

**Purpose**: Retrieve paginated notifications for a user

**Parameters**:

```javascript
{
  userId: string,
  page?: number,        // Default: 1
  limit?: number,       // Default: 20, max: 50
  unreadOnly?: boolean  // Default: false
}
```

**Returns**: Paginated notification list with metadata

**Logic**:

1. Build query based on filters (recipient, isDeleted, isRead)
2. Apply pagination (skip, limit)
3. Sort by createdAt descending
4. Populate sender details (username, name, avatar)
5. Execute query
6. Calculate pagination metadata
7. Return results

---

#### markAsRead(notificationId, userId)

**Purpose**: Mark a specific notification as read

**Parameters**:

- `notificationId`: Notification ID
- `userId`: User ID requesting the action

**Returns**: Updated notification document

**Logic**:

1. Find notification by ID
2. Verify recipient matches userId (authorization)
3. Update isRead to true
4. Update updatedAt timestamp
5. Return updated notification
6. Emit updated count via Socket.IO

---

#### markAllAsRead(userId)

**Purpose**: Mark all notifications for a user as read

**Parameters**:

- `userId`: User ID

**Returns**: Count of modified notifications

**Logic**:

1. Build update query (recipient: userId, isRead: false)
2. Update all matching documents to isRead: true
3. Return count of modified documents
4. Emit updated count via Socket.IO

---

#### getUnreadCount(userId)

**Purpose**: Get count of unread notifications for a user

**Parameters**:

- `userId`: User ID

**Returns**: Number of unread notifications

**Logic**:

1. Count documents where recipient: userId, isRead: false, isDeleted: false
2. Return count

---

## 8. Security Considerations

### 8.1 JWT Validation

- All API endpoints require valid JWT token
- Socket.IO connections require JWT in handshake auth
- Token verification uses existing auth middleware
- Token expiration handled automatically

### 8.2 Authorization Checks

- Users can only access their own notifications
- `recipient` field must match authenticated user ID
- Mark as read operations verify ownership
- Prevents notification spoofing and unauthorized access

### 8.3 Prevent Notification Spoofing

- `sender` field is set by server, not client input
- Notification creation only from trusted service methods
- No direct API to create notifications (only internal service)
- All notifications originate from validated user actions

### 8.4 Rate Limiting

- Apply rate limiting to notification endpoints
- Prevent notification spam
- Suggested limits:
  - Get notifications: 100 requests/minute
  - Mark as read: 200 requests/minute
  - Mark all as read: 10 requests/minute

### 8.5 Input Validation

- Validate all notification types against enum
- Sanitize message text to prevent XSS
- Validate reference IDs exist in database
- Limit metadata size to prevent document bloat
- Use existing validation middleware

### 8.6 Privacy Protection

- Users only see notifications meant for them
- No cross-user notification access
- Soft delete for user control
- Optional: Add notification preferences for fine-grained control

---

## 9. Performance Considerations

### 9.1 Pagination

- Cursor-based pagination preferred for large datasets
- Offset-based pagination for simplicity (current implementation)
- Default limit: 20 items per page
- Maximum limit: 50 items per page
- Efficient for free-tier MongoDB collections

### 9.2 Database Indexing

- Compound indexes on common query patterns
- Index on `recipient + createdAt` for user feeds
- Index on `recipient + isRead + createdAt` for unread filtering
- TTL index for automatic cleanup (90 days)
- Monitor index usage and optimize as needed

### 9.3 Bulk Updates

- `markAllAsRead` uses bulk update operation
- Single database query for multiple document updates
- Efficient for users with many unread notifications

### 9.4 Memory Usage for Socket Mappings

- Use Map data structure for O(1) lookups
- Store only user ID and socket ID pairs
- Automatic cleanup on disconnect
- Monitor memory usage for scaling
- For large scale, consider Redis adapter

### 9.5 Scalability Limitations

**Current Free-Tier Design**:

- Single server Socket.IO instance
- In-memory user-socket mapping
- ~10,000 concurrent connections limit
- Suitable for MVP and early growth

**Scaling Path**:

- Add Redis Socket.IO adapter for horizontal scaling
- Implement Redis pub/sub for multi-server support
- Consider dedicated notification service
- Add load balancer for Socket.IO servers

### 9.6 Query Optimization

- Use `lean()` for read operations (faster, no Mongoose overhead)
- Select only required fields (projection)
- Populate sender details efficiently
- Avoid N+1 query problems
- Use aggregation for complex queries if needed

---

## 10. Future Enhancements

### 10.1 Firebase Cloud Messaging (FCM)

**Purpose**: Mobile push notifications for offline users

**Implementation**:

- Store FCM device tokens per user
- Integrate FCM SDK
- Send push notifications when user is offline
- Support notification categories (alert, silent, etc.)
- Handle push notification click actions

**Architecture Extension**:

```mermaid
graph LR
    A[Notification Service] --> B{User Online?}
    B -->|Yes| C[Socket.IO]
    B -->|No| D[FCM Service]
    D --> E[Mobile Device]
```

**Code Structure**:

- Add `notification.fcm.js` module
- Store device tokens in user document
- Queue push notifications for reliability
- Handle FCM token refresh

---

### 10.2 Web Push Notifications

**Purpose**: Browser push notifications for desktop users

**Implementation**:

- Implement Web Push API
- Generate VAPID keys
- Subscribe users to push notifications
- Send push via web-push library
- Support service worker for background handling

**Benefits**:

- Works even when browser is closed
- Cross-browser support
- No additional infrastructure cost

---

### 10.3 Email Notifications

**Purpose**: Email digest for important notifications

**Implementation**:

- Integrate with existing mailer infrastructure
- Create email templates for notification types
- Batch notifications into daily/weekly digests
- Allow user email preference settings
- Unsubscribe links in emails

**Use Cases**:

- Daily digest of missed notifications
- Important system notifications
- Weekly engagement summary

---

### 10.4 Notification Preferences

**Purpose**: User control over notification types

**Implementation**:

- Create notification preference schema
- UI for users to customize preferences
- Per-type enable/disable settings
- Real-time preference application
- Default preferences for new users

**Preference Options**:

- Email notifications (on/off)
- Push notifications (on/off)
- In-app notifications (on/off)
- Per-type toggles (likes, comments, follows, etc.)
- Quiet hours / do not disturb

---

### 10.5 Notification Batching

**Purpose**: Reduce notification noise for high-activity scenarios

**Implementation**:

- Batch similar notifications within time window
- Group multiple likes into single notification
- Group multiple comments into digest
- Configurable batching intervals
- Unbatch for important notifications

**Example**:

- Instead of 10 separate "X liked your quote" notifications
- Show "John and 9 others liked your quote"

---

### 10.6 Redis-based Socket Scaling

**Purpose**: Horizontal scaling for Socket.IO

**Implementation**:

- Replace in-memory Map with Redis
- Use Redis adapter for Socket.IO
- Enable pub/sub for cross-server communication
- Support multiple Socket.IO servers
- Load balance connections

**Benefits**:

- Support millions of concurrent connections
- High availability
- Automatic failover
- Better memory management

**Architecture**:

```mermaid
graph TB
    A[Load Balancer] --> B[Socket.IO Server 1]
    A --> C[Socket.IO Server 2]
    A --> D[Socket.IO Server 3]
    B --> E[Redis]
    C --> E
    D --> E
    E --> F[Pub/Sub]
```

---

### 10.7 Notification Analytics

**Purpose**: Track notification engagement metrics

**Metrics to Track**:

- Notification delivery rate
- Open rate (click-through)
- Read rate
- Response time
- Per-type engagement
- User engagement trends

**Implementation**:

- Add analytics events to notification actions
- Store in separate analytics collection
- Create dashboard for visualization
- Use data to optimize notification strategy

---

### 10.8 Notification Templates

**Purpose**: Centralized message templates

**Implementation**:

- Create template system for notification messages
- Support multiple languages
- Personalization tokens (username, etc.)
- A/B testing capability
- Easy message updates without code changes

**Example**:

```javascript
const templates = {
  LIKE_QUOTE: "{{senderName}} liked your quote",
  COMMENT_QUOTE: "{{senderName}} commented on your quote",
  FOLLOW_USER: "{{senderName}} started following you",
};
```

---

## 11. Integration Points

### 11.1 Existing Module Integration

The notification module will be integrated into existing modules:

**Quotes Module** (`src/modules/quotes/`):

- Emit notification on quote creation (for tagged users)
- Emit notification on requote

**Reactions Module** (`src/modules/reactions/`):

- Emit notification on like/reaction

**Comments Module** (`src/modules/comments/`):

- Emit notification on comment
- Emit notification on reply

**Follow Module** (if exists):

- Emit notification on follow

### 11.2 Event Emitter Pattern

Use Node.js EventEmitter for loose coupling:

```javascript
// In existing modules
const EventEmitter = require("events");
const notificationEmitter = new EventEmitter();

// When action occurs
notificationEmitter.emit("quote:liked", {
  quoteId,
  likerId,
  quoteCreatorId,
});

// In notification service
notificationEmitter.on("quote:liked", async (data) => {
  await notificationService.createNotification({
    recipient: data.quoteCreatorId,
    sender: data.likerId,
    type: "LIKE_QUOTE",
    // ...
  });
});
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

- Test notification service methods
- Test notification model validation
- Test socket mapping functions
- Test pagination logic
- Test read/unread state management

### 12.2 Integration Tests

- Test API endpoints with authentication
- Test notification creation flow
- Test real-time delivery via Socket.IO
- Test offline notification persistence
- Test authorization checks

### 12.3 End-to-End Tests

- Test complete user flow: action → notification → delivery
- Test multiple concurrent users
- Test pagination navigation
- Test mark as read functionality
- Test unread count accuracy

### 12.4 Load Tests

- Test with 1000+ concurrent socket connections
- Test notification creation rate (1000/second)
- Test database query performance
- Test memory usage under load

---

## 13. Deployment Considerations

### 13.1 Environment Variables

Add to `.env`:

```env
# Socket.IO
SOCKET_PORT=3000
SOCKET_CORS_ORIGIN=http://localhost:3001

# Notification Settings
NOTIFICATION_TTL_DAYS=90
NOTIFICATION_BATCH_INTERVAL_MS=5000
NOTIFICATION_MAX_PER_PAGE=50
```

### 13.2 Database Migration

- Create notification collection with indexes
- No data migration needed for new feature
- Index creation may take time on large datasets

### 13.3 Monitoring

- Monitor notification creation rate
- Monitor socket connection count
- Monitor database query performance
- Monitor memory usage
- Set up alerts for anomalies

---

## 14. Success Criteria

The notification module will be considered successful when:

- ✅ All notification types are supported
- ✅ Real-time delivery works for online users
- ✅ Offline users receive notifications on login
- ✅ Read/unread tracking is accurate
- ✅ Unread count is real-time updated
- ✅ API endpoints are functional and documented
- ✅ Socket.IO integration is stable
- ✅ Security measures prevent unauthorized access
- ✅ Performance meets requirements (<500ms delivery)
- ✅ Free-tier infrastructure supports expected load
- ✅ Code follows existing project patterns
- ✅ JSDoc comments are complete
- ✅ Testing strategy is defined

---

## 15. Implementation Checklist

### Phase 1: Foundation

- [ ] Create notification model with schema
- [ ] Add database indexes
- [ ] Create notification service skeleton
- [ ] Set up Socket.IO server
- [ ] Implement user-socket mapping

### Phase 2: Core Functionality

- [ ] Implement createNotification method
- [ ] Implement getNotifications method
- [ ] Implement markAsRead method
- [ ] Implement markAllAsRead method
- [ ] Implement getUnreadCount method
- [ ] Implement sendRealtimeNotification method

### Phase 3: API Layer

- [ ] Create notification controller
- [ ] Create notification routes
- [ ] Add auth middleware integration
- [ ] Add validation middleware
- [ ] Test all endpoints

### Phase 4: Socket Layer

- [ ] Implement socket authentication
- [ ] Implement connection handling
- [ ] Implement event handlers
- [ ] Implement disconnect handling
- [ ] Test real-time delivery

### Phase 5: Integration

- [ ] Integrate with quotes module
- [ ] Integrate with reactions module
- [ ] Integrate with comments module
- [ ] Add event emitters
- [ ] Test integration points

### Phase 6: Polish

- [ ] Add JSDoc comments
- [ ] Add error handling
- [ ] Add logging
- [ ] Create example client code
- [ ] Write documentation

---

## Appendix A: Example Socket.IO Client Code

```javascript
// notification-client.js
import io from "socket.io-client";

class NotificationClient {
  constructor(token) {
    this.socket = io("http://localhost:3000", {
      auth: { token },
      transports: ["websocket"],
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on("connect", () => {
      console.log("Connected to notification server");
      this.socket.emit("register:user", this.getUserId());
    });

    this.socket.on("notification:new", (notification) => {
      this.handleNewNotification(notification);
    });

    this.socket.on("notification:count", (data) => {
      this.updateBadgeCount(data.unreadCount);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from notification server");
    });
  }

  handleNewNotification(notification) {
    // Show toast
    this.showToast(notification.message);

    // Update badge
    this.incrementBadge();

    // Add to list
    this.prependNotification(notification);

    // Play sound
    this.playSound();
  }

  markAsRead(notificationId) {
    this.socket.emit("notification:read", { notificationId });
  }

  getUserId() {
    // Extract from JWT or local storage
    return localStorage.getItem("userId");
  }

  showToast(message) {
    // Implement toast notification
  }

  updateBadgeCount(count) {
    // Update UI badge
  }

  incrementBadge() {
    // Increment badge count
  }

  prependNotification(notification) {
    // Add to notification list
  }

  playSound() {
    // Play notification sound
  }
}

// Usage
const token = localStorage.getItem("authToken");
const notificationClient = new NotificationClient(token);
```

---

## Appendix B: Example API Requests

```bash
# Get notifications
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Get unread count
curl -X GET http://localhost:3000/api/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Mark as read
curl -X PATCH http://localhost:3000/api/notifications/507f1f77bcf86cd799439011/read \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Mark all as read
curl -X PATCH http://localhost:3000/api/notifications/read-all \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## Appendix C: Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **Validation**: express-validator (or similar)
- **Logging**: Winston (existing)
- **Testing**: Jest/Mocha (to be added)

---

## Conclusion

This notification module design provides a comprehensive, scalable, and production-ready solution for the Qotes social media application. The architecture balances real-time capabilities with persistent storage, follows clean architecture principles, and remains compatible with free-tier infrastructure. The design allows for future enhancements while maintaining a solid foundation for immediate implementation.
