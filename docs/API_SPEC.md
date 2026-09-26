# Qotes API Contract & Response Specification

**Version:** 1.0  
**Date:** September 25, 2026  
**Base URL:** `https://api.qotes.com/v1`  
**Document Owner:** K.V.N. Rajasekhar (Qotes Eng. Team head)

---

## 1. Standard Response Envelope

### 1.1 Success Response

All successful API responses follow this standard envelope format:

```typescript
{
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
    page?: number;
    limit?: number;
  };
}
```

**Example Success Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Quote retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "text": "The only way to do great work is to love what you do.",
    "author": "Steve Jobs",
    "creator": "507f1f77bcf86cd799439012",
    "category": "Motivation",
    "hashtags": ["work", "passion", "success"],
    "likes": 42,
    "saves": 15,
    "requotes": 8,
    "reactions": {
      "insightful": 12,
      "empowering": 18,
      "resonant": 8,
      "artistic": 2,
      "clap": 2
    },
    "isRequote": false,
    "createdAt": "2026-09-25T10:30:00.000Z"
  },
  "meta": {
    "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9",
    "hasMore": true,
    "total": 150
  }
}
```

### 1.2 Failure Response

All error responses follow this standard envelope format:

```typescript
{
  success: false;
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

**Example Failure Response**:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "text",
      "message": "Quote text must be between 10 and 500 characters"
    },
    {
      "field": "hashtags",
      "message": "Maximum 5 hashtags allowed"
    }
  ]
}
```

### 1.3 HTTP Status Codes

| Code | Description           | Usage                                             |
| ---- | --------------------- | ------------------------------------------------- |
| 200  | OK                    | Successful GET, PUT, PATCH requests               |
| 201  | Created               | Successful POST request creating resource         |
| 204  | No Content            | Successful DELETE request                         |
| 400  | Bad Request           | Invalid request parameters or validation errors   |
| 401  | Unauthorized          | Missing or invalid authentication token           |
| 403  | Forbidden             | Valid authentication but insufficient permissions |
| 404  | Not Found             | Resource not found                                |
| 409  | Conflict              | Resource already exists or conflicts with state   |
| 422  | Unprocessable Entity  | Semantic errors in request                        |
| 429  | Too Many Requests     | Rate limit exceeded                               |
| 500  | Internal Server Error | Unexpected server error                           |
| 503  | Service Unavailable   | Service temporarily unavailable                   |

---

## 2. Authentication

### 2.1 Register

**Endpoint**: `POST /v1/auth/signup`  
**Authentication**: None  
**Rate Limit**: 3 requests per minute

**Request Body**:

```typescript
{
  username: string;        // Required, 3-20 characters, alphanumeric
  email: string;          // Required, valid email format
  password: string;       // Required, 8-72 characters
  firstName?: string;     // Optional, max 50 characters
  lastName?: string;      // Optional, max 50 characters
  bio?: string;           // Optional, max 200 characters
  avatar?: File;          // Optional, image file (multipart/form-data)
}
```

**Success Response (201)**:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {}
}
```

**Error Responses**:

- `400`: Validation errors in request fields
- `409`: Username or email already exists

### 2.2 Login

**Endpoint**: `POST /v1/auth/login`  
**Authentication**: None  
**Rate Limit**: 5 requests per minute

**Request Body**:

```typescript
{
  identifier: string; // Required, username or email
  password: string; // Required, user password
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "507f1f77bcf86cd799439011"
  }
}
```

**Headers**:

```
Set-Cookie: refreshToken=...; HttpOnly; Secure; Max-Age=604800; Path=/
```

**Error Responses**:

- `400`: Invalid request format
- `401`: Invalid credentials
- `429`: Too many login attempts

### 2.3 Refresh Token

**Endpoint**: `POST /v1/auth/refresh`  
**Authentication**: Refresh token (httpOnly cookie)  
**Rate Limit**: 10 requests per minute

**Request Headers**:

```
Cookie: refreshToken=...
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:

- `401`: Invalid or expired refresh token
- `429`: Too many refresh attempts

### 2.4 Logout

**Endpoint**: `POST /v1/auth/logout`  
**Authentication**: Bearer JWT (access token)  
**Rate Limit**: None

**Request Headers**:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Cookie: refreshToken=...
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": {}
}
```

**Headers**:

```
Set-Cookie: refreshToken=; HttpOnly; Secure; Max-Age=0; Path=/
```

### 2.5 Forgot Password

**Endpoint**: `POST /v1/auth/forgot-password`  
**Authentication**: None  
**Rate Limit**: 3 requests per minute

**Request Body**:

```typescript
{
  email: string; // Required, valid email format
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset email sent",
  "data": {}
}
```

### 2.6 Reset Password

**Endpoint**: `POST /v1/auth/forgotpassword/:userId/:token`  
**Authentication**: None  
**Rate Limit**: 3 requests per minute

**Request Parameters**:

- `userId`: User ID from reset email
- `token`: Reset token from email

**Request Body**:

```typescript
{
  newPassword: string; // Required, 8-72 characters
  cnfPassword: string; // Required, must match newPassword
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successful",
  "data": {}
}
```

---

## 3. Quotes

### 3.1 Create Quote

**Endpoint**: `POST /v1/quote`  
**Authentication**: Bearer JWT  
**Rate Limit**: 10 requests per minute

**Request Headers**:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:

```typescript
{
  text?: string;              // Required for original quotes, 10-500 characters
  author?: string;            // Optional, default "Anonymous"
  category?: string;          // Optional, pre-defined category
  hashtags?: string[];        // Optional, max 5 hashtags
  taggedUsers?: string[];     // Optional, array of user IDs to mention
  isRequote?: boolean;        // Optional, default false
  parentQuoteId?: string;     // Required if isRequote is true
  isHiddenBySystem?: boolean; // Optional, default false (admin only)
}
```

**Success Response (201)**:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Quote created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "text": "The only way to do great work is to love what you do.",
    "author": "Steve Jobs",
    "creator": "507f1f77bcf86cd799439012",
    "category": "Motivation",
    "hashtags": ["work", "passion"],
    "likes": 0,
    "saves": 0,
    "requotes": 0,
    "reactions": {},
    "isRequote": false,
    "createdAt": "2026-09-25T10:30:00.000Z"
  }
}
```

**Error Responses**:

- `400`: Validation errors or missing required fields
- `401`: Invalid authentication token
- `404`: Parent quote not found (for requotes)

### 3.2 Get Quote by ID

**Endpoint**: `GET /v1/quote/:id`  
**Authentication**: None (public)  
**Rate Limit**: 30 requests per minute

**Request Parameters**:

- `id`: Quote ID

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Quote retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "text": "The only way to do great work is to love what you do.",
    "author": "Steve Jobs",
    "creator": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "stevejobs",
      "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg"
    },
    "category": "Motivation",
    "hashtags": ["work", "passion"],
    "likes": 42,
    "saves": 15,
    "requotes": 8,
    "reactions": {
      "insightful": 12,
      "empowering": 18,
      "resonant": 8,
      "artistic": 2,
      "clap": 2
    },
    "isRequote": false,
    "createdAt": "2026-09-25T10:30:00.000Z"
  }
}
```

**Error Responses**:

- `404`: Quote not found

### 3.3 Get All Quotes (Paginated)

**Endpoint**: `GET /v1/quote`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 20, max 100
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Quotes retrieved successfully",
  "data": {
    "quotes": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "text": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "creator": "507f1f77bcf86cd799439012",
        "category": "Motivation",
        "hashtags": ["work", "passion"],
        "likes": 42,
        "saves": 15,
        "requotes": 8,
        "reactions": {
          "insightful": 12,
          "empowering": 18,
          "resonant": 8,
          "artistic": 2,
          "clap": 2
        },
        "isRequote": false,
        "createdAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9",
      "hasMore": true,
      "total": 150
    }
  }
}
```

### 3.4 Update Quote

**Endpoint**: `PATCH /v1/quote/:id`  
**Authentication**: Bearer JWT  
**Rate Limit**: 10 requests per minute

**Request Parameters**:

- `id`: Quote ID

**Request Body**:

```typescript
{
  text?: string;          // Optional, 10-500 characters
  author?: string;        // Optional
  category?: string;      // Optional
  hashtags?: string[];    // Optional, max 5 hashtags
  isHiddenBySystem?: boolean; // Optional (admin only)
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Quote updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "text": "Updated quote text",
    "author": "Steve Jobs",
    "creator": "507f1f77bcf86cd799439012",
    "category": "Motivation",
    "hashtags": ["work", "passion"],
    "likes": 42,
    "saves": 15,
    "requotes": 8,
    "reactions": {
      "insightful": 12,
      "empowering": 18,
      "resonant": 8,
      "artistic": 2,
      "clap": 2
    },
    "isRequote": false,
    "createdAt": "2026-09-25T10:30:00.000Z"
  }
}
```

**Error Responses**:

- `400`: Validation errors
- `401`: Invalid authentication token
- `403`: Not authorized to update this quote
- `404`: Quote not found

### 3.5 Delete Quote

**Endpoint**: `DELETE /v1/quote/:id`  
**Authentication**: Bearer JWT  
**Rate Limit**: 10 requests per minute

**Request Parameters**:

- `id`: Quote ID

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Quote deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011"
  }
}
```

**Error Responses**:

- `401`: Invalid authentication token
- `403`: Not authorized to delete this quote
- `404`: Quote not found

### 3.6 Get User Quotes

**Endpoint**: `GET /v1/quote/me`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 20, max 100
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User quotes retrieved successfully",
  "data": {
    "quotes": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "text": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "creator": "507f1f77bcf86cd799439012",
        "category": "Motivation",
        "hashtags": ["work", "passion"],
        "likes": 42,
        "saves": 15,
        "requotes": 8,
        "reactions": {
          "insightful": 12,
          "empowering": 18,
          "resonant": 8,
          "artistic": 2,
          "clap": 2
        },
        "isRequote": false,
        "createdAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9",
      "hasMore": true,
      "total": 45
    }
  }
}
```

---

## 4. Feeds

### 4.1 Global Feed

**Endpoint**: `GET /v1/feed/global`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 10, max 50
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Quotes retrieved successfully",
  "data": {
    "quotes": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "text": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "creator": {
          "_id": "507f1f77bcf86cd799439012",
          "username": "stevejobs",
          "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg"
        },
        "category": "Motivation",
        "hashtags": ["work", "passion"],
        "likes": 42,
        "saves": 15,
        "requotes": 8,
        "reactions": {
          "insightful": 12,
          "empowering": 18,
          "resonant": 8,
          "artistic": 2,
          "clap": 2
        },
        "isRequote": false,
        "createdAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9",
      "hasMore": true
    }
  }
}
```

### 4.2 Following Feed

**Endpoint**: `GET /v1/feed/following`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 10, max 50
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Feed loaded",
  "data": {
    "quotes": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "text": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "creator": {
          "_id": "507f1f77bcf86cd799439012",
          "username": "stevejobs",
          "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg"
        },
        "category": "Motivation",
        "hashtags": ["work", "passion"],
        "likes": 42,
        "saves": 15,
        "requotes": 8,
        "reactions": {
          "insightful": 12,
          "empowering": 18,
          "resonant": 8,
          "artistic": 2,
          "clap": 2
        },
        "isRequote": false,
        "createdAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9",
      "hasMore": true
    }
  }
}
```

### 4.3 Discover Feed

**Endpoint**: `GET /v1/feed/discover`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 10, max 50
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Discover feed loaded",
  "data": {
    "quotes": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "text": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "creator": {
          "_id": "507f1f77bcf86cd799439012",
          "username": "stevejobs",
          "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg"
        },
        "category": "Motivation",
        "hashtags": ["work", "passion"],
        "likes": 42,
        "saves": 15,
        "requotes": 8,
        "reactions": {
          "insightful": 12,
          "empowering": 18,
          "resonant": 8,
          "artistic": 2,
          "clap": 2
        },
        "isRequote": false,
        "createdAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9",
      "hasMore": true
    }
  }
}
```

### 4.4 User Quotes Feed

**Endpoint**: `GET /v1/feed/q/:targetuserId`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Parameters**:

- `targetuserId`: Target user ID

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 10, max 50
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User quotes retrieved successfully",
  "data": {
    "quotes": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "text": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "creator": {
          "_id": "507f1f77bcf86cd799439012",
          "username": "stevejobs",
          "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg"
        },
        "category": "Motivation",
        "hashtags": ["work", "passion"],
        "likes": 42,
        "saves": 15,
        "requotes": 8,
        "reactions": {
          "insightful": 12,
          "empowering": 18,
          "resonant": 8,
          "artistic": 2,
          "clap": 2
        },
        "isRequote": false,
        "createdAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9",
      "hasMore": true
    }
  }
}
```

---

## 5. Reactions

### 5.1 Toggle Reaction

**Endpoint**: `POST /v1/reaction/:quoteId/toggle`  
**Authentication**: Bearer JWT  
**Rate Limit**: 20 requests per minute

**Request Parameters**:

- `quoteId`: Quote ID

**Request Body**:

```typescript
{
  type: 'like' | 'inspriring' | 'thoughtful' | 'realatable' | 'eye-opening';
  action: 'add' | 'remove' | 'update';
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reaction updated successfully",
  "data": {
    "quoteId": "507f1f77bcf86cd799439011",
    "userReaction": "inspriring",
    "breakdown": {
      "insightful": 12,
      "empowering": 19,
      "resonant": 8,
      "artistic": 2,
      "clap": 2
    },
    "total": 43
  }
}
```

**Error Responses**:

- `400`: Invalid reaction type or action
- `401`: Invalid authentication token
- `404`: Quote not found

### 5.2 Get Reaction Breakdown

**Endpoint**: `GET /v1/reaction/:quoteId`  
**Authentication**: None (public)  
**Rate Limit**: 30 requests per minute

**Request Parameters**:

- `quoteId`: Quote ID

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reaction breakdown retrieved",
  "data": {
    "quoteId": "507f1f77bcf86cd799439011",
    "breakdown": {
      "insightful": 12,
      "empowering": 18,
      "resonant": 8,
      "artistic": 2,
      "clap": 2
    },
    "total": 42,
    "userReaction": "inspriring" // Only present if authenticated
  }
}
```

### 5.3 Get Reaction Users

**Endpoint**: `GET /v1/reaction/:quoteId/users`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Parameters**:

- `quoteId`: Quote ID

**Request Query Parameters**:

```typescript
{
  type?: string;      // Optional, filter by reaction type
  cursor?: string;    // Optional, pagination cursor
  limit?: number;    // Optional, default 20, max 100
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reaction users retrieved",
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "username": "stevejobs",
        "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg",
        "type": "inspriring",
        "reactedAt": "2026-09-25T10:35:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMiIsInJlYWN0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzU6MDAuMDAwWiJ9",
      "hasMore": true,
      "total": 42
    }
  }
}
```

---

## 6. Collections

### 6.1 Get User Collections

**Endpoint**: `GET /v1/collections`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Collections retrieved successfully",
  "data": {
    "collections": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Bookmarks",
        "description": "My saved quotes",
        "isPrivate": true,
        "isDefault": true,
        "itemCount": 15,
        "createdAt": "2026-09-20T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Philosophy",
        "description": "Philosophical quotes",
        "isPrivate": false,
        "isDefault": false,
        "itemCount": 8,
        "createdAt": "2026-09-22T15:45:00.000Z"
      }
    ],
    "total": 2
  }
}
```

### 6.2 Create Collection

**Endpoint**: `POST /v1/collections`  
**Authentication**: Bearer JWT  
**Rate Limit**: 10 requests per minute

**Request Body**:

```typescript
{
  name: string;         // Required, 1-50 characters
  description?: string; // Optional, max 200 characters
  isPrivate?: boolean;  // Optional, default false
}
```

**Success Response (201)**:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Collection created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Philosophy",
    "description": "Philosophical quotes",
    "isPrivate": false,
    "isDefault": false,
    "itemCount": 0,
    "createdAt": "2026-09-25T10:30:00.000Z"
  }
}
```

**Error Responses**:

- `400`: Validation errors
- `401`: Invalid authentication token
- `409`: Collection name already exists for user

### 6.3 Get Collection Items

**Endpoint**: `GET /v1/collections/:id/items`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Parameters**:

- `id`: Collection ID

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 20, max 100
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Collection items retrieved",
  "data": {
    "collection": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Philosophy",
      "description": "Philosophical quotes",
      "isPrivate": false
    },
    "items": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "text": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "creator": {
          "_id": "507f1f77bcf86cd799439012",
          "username": "stevejobs",
          "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg"
        },
        "addedAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImFkZGVkQXQiOiIyMDI2LTA5LTI1VDEwOjMwOjAwLjAwMFoifQ==",
      "hasMore": true,
      "total": 8
    }
  }
}
```

**Error Responses**:

- `401`: Invalid authentication token
- `403`: Not authorized to access this collection
- `404`: Collection not found

### 6.4 Add Item to Collection

**Endpoint**: `POST /v1/collections/:id/items`  
**Authentication**: Bearer JWT  
**Rate Limit**: 20 requests per minute

**Request Parameters**:

- `id`: Collection ID

**Request Body**:

```typescript
{
  quoteId: string; // Required, quote ID to add
}
```

**Success Response (201)**:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Item added to collection",
  "data": {
    "collectionId": "507f1f77bcf86cd799439014",
    "quoteId": "507f1f77bcf86cd799439011",
    "addedAt": "2026-09-25T10:30:00.000Z"
  }
}
```

**Error Responses**:

- `400`: Validation errors
- `401`: Invalid authentication token
- `403`: Not authorized to modify this collection
- `404`: Collection or quote not found
- `409`: Quote already in collection

### 6.5 Remove Item from Collection

**Endpoint**: `DELETE /v1/collections/:id/items/:quoteId`  
**Authentication**: Bearer JWT  
**Rate Limit**: 20 requests per minute

**Request Parameters**:

- `id`: Collection ID
- `quoteId`: Quote ID to remove

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Item removed from collection",
  "data": {
    "collectionId": "507f1f77bcf86cd799439014",
    "quoteId": "507f1f77bcf86cd799439011"
  }
}
```

**Error Responses**:

- `401`: Invalid authentication token
- `403`: Not authorized to modify this collection
- `404`: Collection or item not found

---

## 7. Social

### 7.1 Toggle Follow

**Endpoint**: `POST /v1/user/:id/follow`  
**Authentication**: Bearer JWT  
**Rate Limit**: 20 requests per minute

**Request Parameters**:

- `id`: Target user ID

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User followed successfully",
  "data": {
    "followed": true,
    "followerCount": 123,
    "followingCount": 45
  }
}
```

**Error Responses**:

- `400`: Cannot follow yourself
- `401`: Invalid authentication token
- `404`: User not found
- `409`: Already following this user

### 7.2 Get User Followers

**Endpoint**: `GET /v1/user/:userId/followers`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Parameters**:

- `userId`: Target user ID

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 20, max 100
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Followers fetched",
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "username": "stevejobs",
        "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg",
        "isFollowing": true,
        "followedAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMiIsImZvbGxvd2VkQXQiOiIyMDI2LTA5LTI1VDEwOjMwOjAwLjAwMFoifQ==",
      "hasMore": true,
      "total": 123
    }
  }
}
```

### 7.3 Get User Following

**Endpoint**: `GET /v1/user/:userId/following`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Parameters**:

- `userId`: Target user ID

**Request Query Parameters**:

```typescript
{
  cursor?: string;     // Optional, pagination cursor
  limit?: number;     // Optional, default 20, max 100
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Following fetched",
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "username": "billgates",
        "avatarUrl": "https://cdn.qotes.com/avatars/billgates.jpg",
        "isFollowing": true,
        "followedAt": "2026-09-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMyIsImZvbGxvd2VkQXQiOiIyMDI2LTA5LTI1VDEwOjMwOjAwLjAwMFoifQ==",
      "hasMore": true,
      "total": 45
    }
  }
}
```

### 7.4 Update User Preferences

**Endpoint**: `POST /v1/user/:id/preferences`  
**Authentication**: Bearer JWT  
**Rate Limit**: 10 requests per minute

**Request Parameters**:

- `id`: User ID (must match authenticated user)

**Request Body**:

```typescript
{
  notInterestedCategories?: string[];    // Optional, categories to filter
  notInterestedHashtags?: string[];      // Optional, hashtags to filter
  notInterestedAuthors?: string[];      // Optional, authors to filter
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Preferences updated successfully",
  "data": {
    "notInterestedCategories": ["Politics", "Sports"],
    "notInterestedHashtags": ["news", "politics"],
    "notInterestedAuthors": []
  }
}
```

**Error Responses**:

- `400`: Validation errors
- `401`: Invalid authentication token
- `403`: Not authorized to modify these preferences

---

## 8. Users

### 8.1 Get User Profile

**Endpoint**: `GET /v1/user/u/:username`  
**Authentication**: None (public)  
**Rate Limit**: 30 requests per minute

**Request Parameters**:

- `username`: Username

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "username": "stevejobs",
    "firstName": "Steve",
    "lastName": "Jobs",
    "bio": "Co-founder of Apple Inc.",
    "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg",
    "stats": {
      "followerCount": 123,
      "followingCount": 45,
      "quoteCount": 67
    },
    "isFollowing": false,
    "isBlocked": false,
    "createdAt": "2026-08-15T10:30:00.000Z"
  }
}
```

**Error Responses**:

- `404`: User not found

### 8.2 Get Current User Profile

**Endpoint**: `GET /v1/user/profile/me`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "username": "stevejobs",
    "email": "steve@apple.com",
    "firstName": "Steve",
    "lastName": "Jobs",
    "bio": "Co-founder of Apple Inc.",
    "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg",
    "stats": {
      "followerCount": 123,
      "followingCount": 45,
      "quoteCount": 67
    },
    "createdAt": "2026-08-15T10:30:00.000Z"
  }
}
```

### 8.3 Update Current User Profile

**Endpoint**: `PATCH /v1/user/profile/me`  
**Authentication**: Bearer JWT  
**Rate Limit**: 10 requests per minute

**Request Body**:

```typescript
{
  firstName?: string;     // Optional, max 50 characters
  lastName?: string;      // Optional, max 50 characters
  email?: string;         // Optional, valid email format
  bio?: string;           // Optional, max 200 characters
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "username": "stevejobs",
    "email": "steve.new@apple.com",
    "firstName": "Steven",
    "lastName": "Jobs",
    "bio": "Updated bio",
    "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs.jpg",
    "stats": {
      "followerCount": 123,
      "followingCount": 45,
      "quoteCount": 67
    }
  }
}
```

**Error Responses**:

- `400`: Validation errors
- `401`: Invalid authentication token
- `409`: Email already in use

### 8.4 Update User Avatar

**Endpoint**: `PUT /v1/user/avatar`  
**Authentication**: Bearer JWT  
**Rate Limit**: 5 requests per hour

**Request Body**:

```
multipart/form-data
avatar: File (image/*, max 5MB)
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "https://cdn.qotes.com/avatars/stevejobs_new.jpg"
  }
}
```

**Error Responses**:

- `400`: Invalid file format or size
- `401`: Invalid authentication token

### 8.5 Get Suggested Users

**Endpoint**: `GET /v1/user/suggested`  
**Authentication**: Bearer JWT  
**Rate Limit**: 30 requests per minute

**Request Query Parameters**:

```typescript
{
  limit?: number;     // Optional, default 8, max 20
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Suggested users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "username": "billgates",
        "avatarUrl": "https://cdn.qotes.com/avatars/billgates.jpg",
        "stats": {
          "followerCount": 89,
          "followingCount": 23,
          "quoteCount": 34
        },
        "isFollowing": false
      }
    ]
  }
}
```

---

## 9. Observability Endpoints

### 9.1 Health Check

**Endpoint**: `GET /health`  
**Authentication**: None  
**Rate Limit**: None

**Success Response (200)**:

```json
{
  "status": "ok",
  "timestamp": "2026-09-25T10:30:00.000Z",
  "uptime": 86400
}
```

### 9.2 Readiness Check

**Endpoint**: `GET /ready`  
**Authentication**: None  
**Rate Limit**: None

**Success Response (200)**:

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "kafka": "ok"
  }
}
```

**Failure Response (503)**:

```json
{
  "status": "not-ready",
  "checks": {
    "database": "failed",
    "redis": "ok",
    "kafka": "ok"
  }
}
```

### 9.3 Metrics

**Endpoint**: `GET /metrics`  
**Authentication**: None (internal use)  
**Rate Limit**: None  
**Format**: Prometheus text format

**Response (text/plain)**:

```
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 1234
http_request_duration_seconds_bucket{le="0.5"} 4567
http_request_duration_seconds_bucket{le="1.0"} 7890
http_request_duration_seconds_bucket{le="+Inf"} 8901
http_request_duration_seconds_sum 450.5
http_request_duration_seconds_count 8901

# HELP active_connections Number of active connections
# TYPE active_connections gauge
active_connections 42

# HELP redis_commands_total Total Redis commands executed
# TYPE redis_commands_total counter
redis_commands_total 1234567
```

---

## 10. Error Response Codes

### 10.1 Validation Errors (400)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "text",
      "message": "Quote text must be between 10 and 500 characters"
    }
  ]
}
```

### 10.2 Authentication Errors (401)

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid or expired authentication token",
  "errors": []
}
```

### 10.3 Authorization Errors (403)

```json
{
  "success": false,
  "statusCode": 403,
  "message": "You do not have permission to perform this action",
  "errors": []
}
```

### 10.4 Not Found Errors (404)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Resource not found",
  "errors": []
}
```

### 10.5 Conflict Errors (409)

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Resource already exists",
  "errors": [
    {
      "field": "username",
      "message": "Username already taken"
    }
  ]
}
```

### 10.6 Rate Limit Errors (429)

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again later.",
  "errors": [],
  "meta": {
    "retryAfter": 30
  }
}
```

### 10.7 Server Errors (500)

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Internal server error",
  "errors": []
}
```

---

## 11. Cursor Pagination

### 11.1 Cursor Format

Cursors are base64-encoded JSON strings containing pagination state:

```typescript
interface Cursor {
  id: string;
  createdAt: string;
  [key: string]: any;
}
```

**Example**:

```
eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9
```

Decoded:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "createdAt": "2026-09-25T10:30:00.000Z"
}
```

### 11.2 Pagination Usage

**Initial Request**:

```
GET /v1/feed/global?limit=10
```

**Subsequent Request**:

```
GET /v1/feed/global?limit=10&cursor=eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9
```

**Response Meta**:

```json
{
  "meta": {
    "cursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjVUMTA6MzA6MDAuMDAwWiJ9",
    "hasMore": true,
    "total": 150
  }
}
```

---

## 12. Webhook Events (Future)

### 12.1 Event Types

```typescript
type WebhookEvent =
  | 'quote.created'
  | 'quote.updated'
  | 'quote.deleted'
  | 'reaction.added'
  | 'reaction.removed'
  | 'user.followed'
  | 'user.unfollowed'
  | 'collection.created'
  | 'collection.updated';
```

### 12.2 Webhook Payload

```json
{
  "id": "evt_1234567890",
  "type": "reaction.added",
  "timestamp": "2026-09-25T10:30:00.000Z",
  "data": {
    "quoteId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "reactionType": "inspriring"
  }
}
```

---

**Document Control**

- **Last Updated**: September 25, 2026
- **Next Review**: November/December, 2026
- **Approved By**: K.V.N. Rajasekhar (Qotes Eng. Team Head)
- **Change History**: Initial version for Phase 1 production release
