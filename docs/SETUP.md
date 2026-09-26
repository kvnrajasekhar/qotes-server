# Qotes Developer Onboarding & Contributor Playbook

**Version:** 1.0  
**Date:** September 25, 2026  
**Document Owner**: K.V.N. Rajasekhar (Qotes Eng. Team Head)

---

## 1. Prerequisites

### 1.1 Required Software

**Development Environment**:

- **Node.js**: v20+ (LTS recommended)
  - Download: https://nodejs.org/
  - Verify: `node --version` (should be v20.x.x or higher)
- **npm**: v9+ (comes with Node.js)
  - Verify: `npm --version`
- **Git**: Latest stable version
  - Download: https://git-scm.com/
  - Verify: `git --version`

**Containerization**:

- **Docker**: v24+
  - Download: https://www.docker.com/products/docker-desktop/
  - Verify: `docker --version`
- **Docker Compose**: v2+
  - Verify: `docker-compose --version`

**Mobile Development** (for qotes-app):

- **Expo CLI**: Latest version
  - Install: `npm install -g expo-cli`
  - Verify: `expo --version`
- **iOS Simulator** (macOS only) or **Android Emulator**
  - iOS: Xcode Command Line Tools
  - Android: Android Studio with Emulator

**Optional Tools**:

- **VS Code**: Recommended IDE with extensions
- **Postman**: API testing
- **MongoDB Compass**: Database GUI (optional)

### 1.2 System Requirements

**Minimum**:

- **RAM**: 8GB
- **Storage**: 20GB free space
- **CPU**: 2 cores

**Recommended**:

- **RAM**: 16GB+
- **Storage**: 50GB free space
- **CPU**: 4+ cores

### 1.3 Account Setup

**Required Services**:

- **GitHub**: For code repository access
- **Cloudinary**: For media storage (free tier available)
- **Upstash Redis**: For Redis hosting (free tier available)
- **MongoDB Atlas**: For database hosting (free tier available)
- **Kafka Provider**: (e.g., Confluent, Aiven) or local Kafka

---

## 2. Local Infrastructure Boot

### 2.1 Docker Compose Configuration

Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: qotes-mongodb
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: qotes
    volumes:
      - mongodb_data:/data/db
    networks:
      - qotes-network

  redis:
    image: redis:7-alpine
    container_name: qotes-redis
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - qotes-network

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: qotes-zookeeper
    ports:
      - '2181:2181'
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - qotes-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: qotes-kafka
    ports:
      - '9092:9092'
      - '9093:9093'
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
    depends_on:
      - zookeeper
    networks:
      - qotes-network

volumes:
  mongodb_data:
  redis_data:

networks:
  qotes-network:
    driver: bridge
```

### 2.2 Starting Infrastructure

**Start all services**:

```bash
docker-compose up -d
```

**Check service status**:

```bash
docker-compose ps
```

**View logs**:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f mongodb
docker-compose logs -f redis
docker-compose logs -f kafka
```

**Stop services**:

```bash
docker-compose down
```

**Stop and remove volumes**:

```bash
docker-compose down -v
```

### 2.3 Service Verification

**MongoDB**:

```bash
# Connect to MongoDB
docker exec -it qotes-mongodb mongosh -u admin -p password

# In MongoDB shell
show databases
use qotes
db.createCollection('test')
db.test.insertOne({test: 'data'})
db.test.find()
```

**Redis**:

```bash
# Connect to Redis
docker exec -it qotes-redis redis-cli

# In Redis CLI
ping
set test "hello"
get test
```

**Kafka**:

```bash
# Create a test topic
docker exec -it qotes-kafka kafka-topics --create --topic test-topic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1

# List topics
docker exec -it qotes-kafka kafka-topics --list --bootstrap-server localhost:9092

# Produce test message
docker exec -it qotes-kafka kafka-console-producer --topic test-topic --bootstrap-server localhost:9092

# Consume test message
docker exec -it qotes-kafka kafka-console-consumer --topic test-topic --from-beginning --bootstrap-server localhost:9092
```

---

## 3. Environment Configuration

### 3.1 Backend Environment (.env.example)

Create `.env` file in `qotes-server/` directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://admin:password@localhost:27017/qotes?authSource=admin
MONGO_URI=mongodb://admin:password@localhost:27017/qotes?authSource=admin

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Authentication Secrets
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-change-this
REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
API_KEY_SECRET=your-api-key-secret-change-this

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration (Nodemailer)
EMAIL=your-email@example.com
PASSWORD=your-email-password-or-app-specific-password

# App Settings
SOCKET_CORS_ORIGIN=http://localhost:8081
NOTIFICATIONS_ENABLED=true
IMAGE_GENERATION_ENABLED=true

# Kafka Configuration
ENABLE_KAFKA=true
KAFKA_BROKERS=localhost:9092
KAFKA_USERNAME=your-kafka-username
KAFKA_PASSWORD=your-kafka-password
KAFKA_CA_PATH=./infrastructure/kafka/certs/ca.pem

# Consumer Groups
REACTION_CONSUMER_GROUP=reaction-persistence-group
AUTH_CONSUMER_GROUP=auth-persistence-group
```

### 3.2 Frontend Environment (.env.example)

Create `.env` file in `qotes-app/` directory:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000/v1
EXPO_PUBLIC_WS_URL=ws://localhost:3000

# App Configuration
EXPO_PUBLIC_APP_NAME=Qotes
EXPO_PUBLIC_APP_ENV=development

# Feature Flags
EXPO_PUBLIC_ENABLE_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_IMAGE_GENERATION=true
EXPO_PUBLIC_ENABLE_ANALYTICS=false

# Social Configuration
EXPO_PUBLIC_ENABLE_SOCIAL_SHARING=true
EXPO_PUBLIC_SOCIAL_SHARE_URL=https://qotes.com
```

### 3.3 Environment Variable Security

**Never commit `.env` files** to version control. The `.gitignore` should include:

```
.env
.env.local
.env.*.local
```

**Production Secrets**:

- Use environment-specific secret management
- Consider using AWS Secrets Manager, HashiCorp Vault, or similar
- Rotate secrets regularly
- Use different secrets for each environment

---

## 4. Backend Setup (qotes-server)

### 4.1 Installation

**Navigate to server directory**:

```bash
cd qotes-server
```

**Install dependencies**:

```bash
npm install
```

**Verify installation**:

```bash
npm list --depth=0
```

### 4.2 Database Setup

**Run database seeders** (if available):

```bash
npm run seed
```

**Manual database verification**:

```bash
# Connect to MongoDB
docker exec -it qotes-mongodb mongosh -u admin -p password

# Switch to qotes database
use qotes

# Verify collections
show collections
```

### 4.3 Kafka Topic Initialization

**Initialize Kafka topics**:

```bash
npm run kafka:init
```

**Verify topics created**:

```bash
docker exec -it qotes-kafka kafka-topics --list --bootstrap-server localhost:9092
```

Expected topics:

- `auth-events`
- `reaction-events`
- `auth-events-dlq`
- `reaction-events-dlq`

### 4.4 Running the Server

**Development mode**:

```bash
npm run dev
```

**Production mode**:

```bash
npm run prod
```

**Build for production**:

```bash
npm run build
npm start
```

### 4.5 Running Background Workers

**Reaction persistence worker**:

```bash
npm run worker:reaction
```

**Cache hydration worker**:

```bash
npm run worker:cache
```

**Image generation worker**:

```bash
npm run worker:image
```

**Notification worker**:

```bash
npm run worker:notification
```

**Cron worker**:

```bash
npm run worker:cron
```

**Content sync worker**:

```bash
npm run worker:content-sync
```

### 4.6 Running Kafka Consumers

**Start all consumers**:

```bash
npm run start:consumers
```

**Start specific consumer**:

```bash
# Reaction consumer
ts-node src/infrastructure/kafka/startConsumers.ts
```

### 4.7 DLQ Replay

**Replay failed messages from DLQ**:

```bash
npm run dlq:replay
```

### 4.8 Verification

**Health check**:

```bash
curl http://localhost:3000/health
```

**Readiness check**:

```bash
curl http://localhost:3000/ready
```

**Metrics endpoint**:

```bash
curl http://localhost:3000/metrics
```

---

## 5. Frontend Setup (qotes-app)

### 5.1 Installation

**Navigate to app directory**:

```bash
cd qotes-app
```

**Install dependencies**:

```bash
npm install
```

**Verify installation**:

```bash
npm list --depth=0
```

### 5.2 Expo Configuration

**Check app configuration** in `app.json`:

```json
{
  "expo": {
    "name": "Qotes",
    "slug": "qotes",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.qotes.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.qotes.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### 5.3 Running the App

**Start Expo development server**:

```bash
npx expo start
```

**Clear Metro cache** (if needed):

```bash
npx expo start -c
```

### 5.4 Targeting Platforms

**iOS Simulator** (macOS only):

```bash
# Press 'i' in Expo CLI or
npx expo start --ios
```

**Android Emulator**:

```bash
# Press 'a' in Expo CLI or
npx expo start --android
```

**Web Preview**:

```bash
# Press 'w' in Expo CLI or
npx expo start --web
```

### 5.5 Expo Development Tools

**Expo Go App**:

- Download Expo Go from App Store (iOS) or Google Play (Android)
- Scan QR code from Expo CLI
- Test on physical device

**Expo DevTools**:

- Access at http://localhost:19002
- View logs, device info, and network requests

### 5.6 Building for Production

**iOS Build**:

```bash
eas build --platform ios
```

**Android Build**:

```bash
eas build --platform android
```

**Web Build**:

```bash
npx expo export:web
```

---

## 6. Team Git & Code Quality Workflow

### 6.1 Repository Structure

```
qotes/
├── qotes-app/          # React Native mobile app
├── qotes-server/       # NestJS backend
├── docs/               # Documentation
└── README.md           # Project overview
```

### 6.2 Branch Strategy

**Main Branches**:

- `main`: Production-ready code
- `develop`: Integration branch for features

**Feature Branches**:

- Format: `feature/feature-name`
- Example: `feature/user-authentication`
- Branch from: `develop`

**Bugfix Branches**:

- Format: `bugfix/bug-description`
- Example: `bugfix/reaction-counter-sync`
- Branch from: `develop`

**Hotfix Branches**:

- Format: `hotfix/urgent-fix`
- Example: `hotfix/security-patch`
- Branch from: `main`

### 6.3 Commit Convention

Follow Conventional Commits specification:

**Format**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples**:

```bash
feat(auth): add JWT refresh token rotation
fix(reactions): resolve counter sync issue
docs(api): update authentication endpoints
style(quotes): format quote model
refactor(feed): optimize feed query performance
test(collections): add collection service tests
chore(deps): update dependencies
perf(cache): implement Redis pipeline
```

### 6.4 Pre-Commit Hooks

**Husky Configuration** (already configured in package.json):

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md,css,html}": ["prettier --write"]
  }
}
```

**Automatic execution on commit**:

- Prettier formatting
- ESLint fixing
- Commit message validation

### 6.5 Code Quality Tools

**ESLint**:

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

**Prettier**:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

**TypeScript**:

```bash
# Type checking
npx tsc --noEmit
```

### 6.6 Pull Request Process

**Before Creating PR**:

1. Update/create documentation
2. Ensure all tests pass
3. Run linting and fix issues
4. Update CHANGELOG if applicable
5. Rebase from target branch

**PR Template**:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commit messages follow convention

## Related Issues

Closes #123
Related to #456
```

**PR Review Guidelines**:

- At least one approval required
- All CI checks must pass
- Address all review comments
- Squash commits before merge

### 6.7 Code Review Best Practices

**For Reviewers**:

- Review logic and implementation
- Check for security vulnerabilities
- Verify test coverage
- Suggest improvements constructively
- Respond within 24 hours

**For Authors**:

- Provide context in PR description
- Keep PRs focused and small
- Respond to feedback promptly
- Update based on review comments
- Document complex decisions

---

## 7. Development Workflow

### 7.1 Daily Development Cycle

**Start of Day**:

```bash
# Pull latest changes
git checkout develop
git pull origin develop

# Start infrastructure
docker-compose up -d

# Start backend
cd qotes-server
npm run dev

# Start frontend (new terminal)
cd qotes-app
npx expo start
```

**During Development**:

```bash
# Run tests
npm run test

# Check linting
npm run lint

# Format code
npm run format
```

**End of Day**:

```bash
# Commit changes
git add .
git commit -m "feat: description"

# Push to feature branch
git push origin feature/feature-name
```

### 7.2 Testing Strategy

**Unit Tests**:

```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage
```

**Integration Tests**:

```bash
# Run integration tests
npm run test:integration
```

**E2E Tests** (future):

```bash
# Run E2E tests
npm run test:e2e
```

### 7.3 Debugging

**Backend Debugging**:

```bash
# Run with Node debugger
node --inspect dist/main.js

# Or use VS Code debugger
# Set breakpoints in VS Code and press F5
```

**Frontend Debugging**:

```bash
# React Native Debugger
# Install React Native Debugger app
# Set up in app.json or use Expo DevTools
```

**Database Debugging**:

```bash
# MongoDB Compass GUI
# Connect to: mongodb://admin:password@localhost:27017/qotes?authSource=admin

# Or use command line
docker exec -it qotes-mongodb mongosh -u admin -p password
```

**Redis Debugging**:

```bash
# Redis Commander GUI
docker run -d --name redis-commander -p 8081:8081 \
  -e REDIS_HOSTS=local:localhost:6379 \
  rediscommander/redis-commander

# Access at http://localhost:8081
```

---

## 8. Troubleshooting

### 8.1 Common Issues

**Port Already in Use**:

```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

**Docker Container Issues**:

```bash
# Restart specific container
docker-compose restart mongodb

# Rebuild container
docker-compose up -d --build mongodb

# View container logs
docker-compose logs mongodb
```

**MongoDB Connection Issues**:

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker exec -it qotes-mongodb mongosh -u admin -p password
```

**Redis Connection Issues**:

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker exec -it qotes-redis redis-cli ping
```

**Kafka Connection Issues**:

```bash
# Check Kafka is running
docker-compose ps kafka

# Check Kafka logs
docker-compose logs kafka

# Verify topics
docker exec -it qotes-kafka kafka-topics --list --bootstrap-server localhost:9092
```

**Expo Build Issues**:

```bash
# Clear Metro cache
npx expo start -c

# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Reset Expo cache
npx expo start --clear
```

### 8.2 Performance Issues

**Slow API Response**:

```bash
# Check MongoDB queries
# Enable profiling in MongoDB
use qotes
db.setProfilingLevel(2)
db.system.profile.find().sort({ts: -1}).limit(10)

# Check Redis memory usage
docker exec -it qotes-redis redis-cli INFO memory
```

**Memory Issues**:

```bash
# Check Node.js memory
node --inspect dist/main.js
# Then use Chrome DevTools Memory profiler

# Check Docker memory usage
docker stats
```

### 8.3 Getting Help

**Internal Resources**:

- Check documentation in `docs/` folder
- Search existing GitHub issues
- Check team Slack/Discord channels

**External Resources**:

- NestJS Documentation: https://docs.nestjs.com/
- React Native Documentation: https://reactnative.dev/
- Expo Documentation: https://docs.expo.dev/
- MongoDB Documentation: https://docs.mongodb.com/
- Redis Documentation: https://redis.io/docs/

---

## 9. Deployment

### 9.1 Backend Deployment

**Environment Setup**:

```bash
# Set production environment variables
export NODE_ENV=production
export PORT=3000
# ... other production variables
```

**Build**:

```bash
npm run build
```

**Start**:

```bash
npm start
```

**Process Management** (PM2):

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/main.js --name qotes-server

# Monitor
pm2 monit

# Logs
pm2 logs qotes-server

# Restart
pm2 restart qotes-server
```

### 9.2 Frontend Deployment

**EAS Build**:

```bash
# Configure EAS
npx eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

**Web Deployment**:

```bash
# Build for web
npx expo export:web

# Deploy to hosting service
# (e.g., Vercel, Netlify, AWS S3)
```

### 9.3 Infrastructure Deployment

**Production Docker Compose**:

```bash
# Use production docker-compose.yml
docker-compose -f docker-compose.prod.yml up -d
```

**Kubernetes** (future):

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

---

## 10. Monitoring & Maintenance

### 10.1 Log Management

**Application Logs**:

```bash
# View logs
tail -f logs/combined.log

# Error logs
tail -f logs/error.log
```

**Docker Logs**:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f qotes-server
```

### 10.2 Health Monitoring

**Automated Health Checks**:

```bash
# Add to cron or monitoring system
*/5 * * * * curl -f http://localhost:3000/health || alert
*/5 * * * * curl -f http://localhost:3000/ready || alert
```

**Manual Health Check**:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/metrics
```

### 10.3 Backup Strategy

**Database Backups**:

```bash
# MongoDB backup
docker exec qotes-mongodb mongodump -u admin -p password --db qotes --out /backup

# Restore backup
docker exec qotes-mongodb mongorestore -u admin -p password --db qotes /backup/qotes
```

**Redis Backups**:

```bash
# Redis snapshot (automatic with AOF)
# Manual backup
docker exec qotes-redis redis-cli BGSAVE
```

---

## 11. Security Best Practices

### 11.1 Development Security

**Never commit sensitive data**:

- API keys
- Passwords
- Secret keys
- Certificates

**Use environment variables**:

- All secrets in `.env` files
- Different `.env` for each environment
- Use `.env.example` as template

**Regular dependency updates**:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### 11.2 Code Security

**Input Validation**:

- Validate all user inputs
- Sanitize data before storage
- Use parameterized queries

**Authentication**:

- Use JWT for API authentication
- Implement refresh token rotation
- Use bcrypt for password hashing

**Rate Limiting**:

- Implement rate limiting on all endpoints
- Use Redis for distributed rate limiting
- Monitor for abuse patterns

---

## 12. Contributing Guidelines

### 12.1 Before Contributing

1. Read this document thoroughly
2. Set up local development environment
3. Understand the codebase architecture
4. Check existing issues and PRs

### 12.2 Making Contributions

**Small Changes**:

- Fork the repository
- Create feature branch
- Make changes
- Test thoroughly
- Submit PR

**Large Changes**:

- Discuss in issue/PR first
- Get approval for approach
- Implement incrementally
- Submit PRs for each component

### 12.3 First-Time Contributors

**Good First Issues**:

- Look for "good first issue" label
- Documentation improvements
- Bug fixes
- Small feature additions

**Getting Help**:

- Ask questions in issues
- Join team communication channels
- Attend team standups (if applicable)

---

## 13. Additional Resources

### 13.1 Documentation

- **Product Requirements**: `docs/PRD.md`
- **System Architecture**: `docs/ARCHITECTURE.md`
- **API Specification**: `docs/API_SPEC.md`
- **This Document**: `docs/SETUP.md`

### 13.2 Internal Tools

- **Admin Dashboard**: (URL when available)
- **Monitoring Dashboard**: (URL when available)
- **Error Tracking**: (Sentry/other tool URL when available)

### 13.3 External Resources

- **NestJS**: https://docs.nestjs.com/
- **React Native**: https://reactnative.dev/
- **Expo**: https://docs.expo.dev/
- **MongoDB**: https://docs.mongodb.com/
- **Redis**: https://redis.io/docs/
- **Kafka**: https://kafka.apache.org/documentation/

---

## 14. Quick Reference

### 14.1 Common Commands

**Backend**:

```bash
cd qotes-server
npm install              # Install dependencies
npm run dev             # Development mode
npm run build           # Build for production
npm start               # Start production server
npm run lint            # Run ESLint
npm run format          # Format code
npm run test            # Run tests
```

**Frontend**:

```bash
cd qotes-app
npm install              # Install dependencies
npx expo start          # Start development server
npx expo start -c       # Start with cache cleared
npx expo start --ios    # Start iOS simulator
npx expo start --android # Start Android emulator
npx expo start --web    # Start web preview
```

**Infrastructure**:

```bash
docker-compose up -d    # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs
docker-compose ps        # Check status
```

### 14.2 Service URLs

**Local Development**:

- Backend API: http://localhost:3000
- Frontend: http://localhost:19002 (Expo DevTools)
- MongoDB: mongodb://localhost:27017
- Redis: redis://localhost:6379
- Kafka: localhost:9092

### 14.3 Default Credentials

#### MongoDB

- **Username**: `admin`
- **Password**: `password`
- **Database**: `qotes`

#### Redis

- **Local Development**: No authentication
- **Production Testing**: Upstash (Free Tier)

#### Kafka

- **Local Development**: No authentication
- **Production Testing**: Aiven Cloud Kafka service (Free Tier)

---

**Document Control**

- **Last Updated**: September 25, 2026
  **Next Review**: November/December, 2026
- **Approved By**: K.V.N.Rajasekhar (Qotes Eng. Team Head)
- **Change History**: Initial version for Phase 1 production release
