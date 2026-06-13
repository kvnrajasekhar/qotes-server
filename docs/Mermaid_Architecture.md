# System Architecture

flowchart LR

    %% =========================
    %% CLIENT
    %% =========================
    subgraph Client["Client"]
        Browser["User Client<br/>Web / Mobile"]
    end

    %% =========================
    %% API
    %% =========================
    subgraph API["qotes-server API"]
        App["Express App<br/>src/app.js"]
        AuthMW["JWT Auth Middleware<br/>src/shared/middlewares/auth.middleware.js"]
        RateLimit["Rate Limiter / Redis Lua<br/>src/shared/utils/redis.utils.js"]
        Health["Health / Ready / Metrics Endpoints"]

        AuthModule["Auth Module"]
        UserModule["User Module"]
        QuoteModule["Quote Module"]
        ReactionModule["Reaction Module"]
        FeedModule["Feed Module"]
        CommentModule["Comment Module"]
        CollectionModule["Collection Module"]
        PreferenceModule["Preference Module"]
        SafetyModule["Safety Module"]
        SearchModule["Search Module"]
        AdminModule["Admin Module"]
    end

    %% =========================
    %% INFRASTRUCTURE
    %% =========================
    subgraph Persistence["Persistence & Infrastructure"]
        Mongo[("MongoDB")]
        Redis[("Redis Cache")]
        Kafka[("Kafka Broker")]
        Cloudinary["Cloudinary"]
        SMTP["SMTP / Gmail"]
    end

    %% =========================
    %% WORKERS
    %% =========================
    subgraph Workers["Async Workers & DLQ"]
        ReactionWorker["Reaction Worker<br/>src/workers/reaction.worker.js"]
        CacheWorker["Login/Follower Cache Worker<br/>src/workers/loginFollowerCache.worker.js"]
        DLQWorker["DLQ Replayer<br/>src/infrastructure/kafka/dlq/universal.dlq.js"]
    end

    %% =========================
    %% FLOWS
    %% =========================

    Browser -->|"HTTPS REST / Bearer Token"| App

    App -->|"Auth Header"| AuthMW

    AuthMW --> AuthModule
    AuthMW --> UserModule
    AuthMW --> QuoteModule
    AuthMW --> ReactionModule
    AuthMW --> FeedModule
    AuthMW --> CommentModule
    AuthMW --> CollectionModule
    AuthMW --> PreferenceModule
    AuthMW --> SafetyModule
    AuthMW --> SearchModule
    AuthMW --> AdminModule

    App --> Health

    AuthModule -->|"CRUD / Auth"| Mongo
    UserModule -->|"CRUD / Profile"| Mongo
    QuoteModule -->|"CRUD / Quotes"| Mongo
    ReactionModule -->|"Query / Update Reactions"| Mongo
    FeedModule -->|"Read Feeds"| Mongo
    CommentModule -->|"Comments"| Mongo
    CollectionModule -->|"Saved Quotes"| Mongo
    PreferenceModule -->|"User Preferences"| Mongo
    SafetyModule -->|"Blocking / Reports"| Mongo
    SearchModule -->|"Search Queries"| Mongo
    AdminModule -->|"Admin Actions"| Mongo

    ReactionModule -->|"Cache Fast Path"| Redis
    ReactionModule -->|"Publish Event"| Kafka

    AuthModule -->|"Publish Login Event"| Kafka

    QuoteModule -->|"Upload Avatar / Image"| Cloudinary
    AuthModule -->|"Send Reset Email"| SMTP

    App -->|"Ready Probe Checks"| Redis
    App -->|"Ready Probe Checks"| Kafka
    App -->|"Ready Probe Checks"| Mongo

    ReactionWorker -->|"Consume Reaction Events"| Kafka
    ReactionWorker -->|"Update Reaction Aggregates"| Mongo
    ReactionWorker -->|"Failed Events to DLQ"| Kafka

    CacheWorker -->|"Consume Auth Events"| Kafka
    CacheWorker -->|"Warm Follower Cache"| Redis

    DLQWorker -->|"Replay DLQ Messages"| Kafka

    AuthModule -->|"Issue JWT / Refresh Token"| Mongo
    UserModule -->|"Store Refresh Token"| Mongo

    %% =========================
    %% CLICKABLE MODULES
    %% =========================

    click AuthModule "https://github.com/your-org/qotes-server/tree/main/src/modules/auth" "_blank"
    click UserModule "https://github.com/your-org/qotes-server/tree/main/src/modules/users" "_blank"
    click QuoteModule "https://github.com/your-org/qotes-server/tree/main/src/modules/quotes" "_blank"
    click ReactionModule "https://github.com/your-org/qotes-server/tree/main/src/modules/reactions" "_blank"
    click FeedModule "https://github.com/your-org/qotes-server/tree/main/src/modules/feeds" "_blank"
    click CommentModule "https://github.com/your-org/qotes-server/tree/main/src/modules/comments" "_blank"
    click CollectionModule "https://github.com/your-org/qotes-server/tree/main/src/modules/collections" "_blank"
    click PreferenceModule "https://github.com/your-org/qotes-server/tree/main/src/modules/preferences" "_blank"
    click SafetyModule "https://github.com/your-org/qotes-server/tree/main/src/modules/safety" "_blank"
    click SearchModule "https://github.com/your-org/qotes-server/tree/main/src/modules/search" "_blank"
    click AdminModule "https://github.com/your-org/qotes-server/tree/main/src/modules/admin" "_blank"

    %% =========================
    %% NODE COLOR CLASSES
    %% =========================

    classDef client fill:#2563EB,color:#fff,stroke:#0F172A,stroke-width:4px;
    classDef gateway fill:#F97316,color:#fff,stroke:#7C2D12,stroke-width:4px;
    classDef module fill:#EF4444,color:#fff,stroke:#7F1D1D,stroke-width:3px;
    classDef infra fill:#2563EB,color:#fff,stroke:#0F172A,stroke-width:4px;
    classDef worker fill:#22C55E,color:#fff,stroke:#14532D,stroke-width:4px;
    classDef utility fill:#EC4899,color:#fff,stroke:#831843,stroke-width:4px;

    class Browser client;

    class App,AuthMW gateway;
    class RateLimit,Health utility;

    class AuthModule,UserModule,QuoteModule,ReactionModule,FeedModule,CommentModule,CollectionModule,PreferenceModule,SafetyModule,SearchModule,AdminModule module;

    class Mongo,Redis,Kafka,Cloudinary,SMTP infra;

    class ReactionWorker,CacheWorker,DLQWorker worker;

    %% =========================
    %% COLORED LINKS
    %% =========================

    linkStyle 0 stroke:#2563EB,stroke-width:4px
    linkStyle 1 stroke:#F97316,stroke-width:4px

    linkStyle 2 stroke:#EF4444,stroke-width:3px
    linkStyle 3 stroke:#EF4444,stroke-width:3px
    linkStyle 4 stroke:#EF4444,stroke-width:3px
    linkStyle 5 stroke:#EF4444,stroke-width:3px
    linkStyle 6 stroke:#EF4444,stroke-width:3px
    linkStyle 7 stroke:#EF4444,stroke-width:3px
    linkStyle 8 stroke:#EF4444,stroke-width:3px
    linkStyle 9 stroke:#EF4444,stroke-width:3px
    linkStyle 10 stroke:#EF4444,stroke-width:3px
    linkStyle 11 stroke:#EF4444,stroke-width:3px
    linkStyle 12 stroke:#EF4444,stroke-width:3px

    linkStyle 13 stroke:#2563EB,stroke-width:3px
    linkStyle 14 stroke:#2563EB,stroke-width:3px
    linkStyle 15 stroke:#2563EB,stroke-width:3px
    linkStyle 16 stroke:#2563EB,stroke-width:3px
    linkStyle 17 stroke:#2563EB,stroke-width:3px
    linkStyle 18 stroke:#2563EB,stroke-width:3px
    linkStyle 19 stroke:#2563EB,stroke-width:3px
    linkStyle 20 stroke:#2563EB,stroke-width:3px
    linkStyle 21 stroke:#2563EB,stroke-width:3px
    linkStyle 22 stroke:#2563EB,stroke-width:3px
    linkStyle 23 stroke:#2563EB,stroke-width:3px

    linkStyle 24 stroke:#F59E0B,stroke-width:4px
    linkStyle 25 stroke:#8B5CF6,stroke-width:4px
    linkStyle 26 stroke:#8B5CF6,stroke-width:4px
    linkStyle 27 stroke:#EC4899,stroke-width:4px
    linkStyle 28 stroke:#EC4899,stroke-width:4px

    linkStyle 29 stroke:#14B8A6,stroke-width:4px
    linkStyle 30 stroke:#14B8A6,stroke-width:4px
    linkStyle 31 stroke:#14B8A6,stroke-width:4px

    linkStyle 32 stroke:#22C55E,stroke-width:4px
    linkStyle 33 stroke:#22C55E,stroke-width:4px

    linkStyle 34 stroke:#F97316,stroke-width:4px

    linkStyle 35 stroke:#2563EB,stroke-width:4px
    linkStyle 36 stroke:#2563EB,stroke-width:4px
