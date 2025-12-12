# Declutter Marketplace - NestJS Migration

A complete migration of the Declutter e-commerce marketplace from Python/FastAPI to Node.js/NestJS for improved scalability and AWS deployment.

## Features

- E-commerce marketplace with escrow payment system
- JWT authentication with role-based access control
- Real-time notifications via WebSockets
- Cloudinary integration for image/video uploads
- Paystack payment gateway integration
- Automated escrow release after timeout
- Admin dashboard functionality
- Complaint/dispute management system

## Tech Stack

- **NestJS 10** - Enterprise Node.js framework with TypeScript
- **Prisma ORM** - Type-safe database access for PostgreSQL
- **PostgreSQL** - Relational database
- **JWT** - Secure authentication
- **Cloudinary** - Cloud-based media storage
- **Paystack** - Payment processing for Nigeria
- **Socket.IO** - Real-time WebSocket communication
- **Bcrypt** - Password hashing
- **Class-validator** - Request validation

## Installation

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### 1. Fix npm permissions (macOS/Linux, if needed)
```bash
sudo chown -R $(whoami) "/Users/$(whoami)/.npm"
```

### 2. Clone and install
```bash
cd /Users/macintosh/Downloads/dback-nestjs
npm install
```

### 3. Environment setup
```bash
cp .env.example .env
```

Edit [.env](.env) with your credentials:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/declutter"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Paystack
PAYSTACK_SECRET_KEY="sk_test_xxxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"

# App Config
PORT=3000
NODE_ENV=development
AUTO_RELEASE_AFTER_MINUTES=4320

# AWS (optional, for deployment)
AWS_REGION="us-east-1"
```

### 4. Database setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates tables)
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 5. Run the application
```bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The API will be available at: `http://localhost:3000/api`

## API Documentation

### Base URL
All endpoints are prefixed with `/api`

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/accept-terms` | Accept terms of service | Yes |

### User Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/me` | Get current user profile | Yes |
| PUT | `/api/users/me` | Update own profile | Yes |
| GET | `/api/users` | List all users (paginated) | Admin only |

### Product Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/products` | Create product (with images/videos) | Yes |
| GET | `/api/products` | List products (search, filter) | No |
| GET | `/api/products/:id` | Get product details | No |

### Order Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/orders` | Create order | Yes |
| GET | `/api/orders/my` | Get user's orders (buyer & seller) | Yes |
| GET | `/api/orders` | List all orders | Admin only |
| PUT | `/api/orders/:id/status` | Update order status (seller) | Yes |
| POST | `/api/orders/:id/confirm_received` | Buyer confirms receipt | Yes |
| POST | `/api/orders/:id/confirm_satisfied` | Buyer confirms satisfaction | Yes |

### Payment Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/payments/initialize` | Initialize Paystack payment | Yes |
| GET | `/api/payments/verify/:reference` | Verify payment | No |
| POST | `/api/payments/webhook` | Paystack webhook handler | No (signed) |

### WebSocket Events
Connect to: `ws://localhost:3000`

**Client → Server:**
- `join_order_room` - Join specific order room
- `join_admin_room` - Join admin notifications room

**Server → Client:**
- `order_update` - Order status changed
- `admin_order_update` - New orders for admins

## Project Structure

```
dback-nestjs/
├── src/
│   ├── common/              # Shared utilities
│   │   ├── decorators/      # Custom decorators (@CurrentUser, @Roles)
│   │   ├── guards/          # Auth guards (JWT, Roles)
│   │   ├── filters/         # Exception filters
│   │   └── interceptors/    # Request/response interceptors
│   ├── config/              # Configuration files
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication (signup, login, JWT)
│   │   ├── users/           # User management
│   │   ├── products/        # Product CRUD with file uploads
│   │   ├── orders/          # Order lifecycle management
│   │   ├── payments/        # Paystack integration
│   │   ├── complaints/      # Dispute system
│   │   ├── seller/          # Seller statistics
│   │   ├── admin/           # Admin operations
│   │   └── websocket/       # WebSocket gateway
│   ├── prisma/              # Prisma service
│   ├── services/            # Shared services (Cloudinary, Paystack)
│   ├── tasks/               # Scheduled tasks (escrow auto-release)
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── prisma/
│   └── schema.prisma        # Database schema
├── uploads/                 # Temporary file uploads
├── .env.example             # Environment template
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Local Docker setup
├── AWS_DEPLOYMENT.md        # AWS deployment guide
└── package.json
```

## Database Schema

The application uses 5 main models:

1. **User** - User accounts with roles (admin/user)
2. **Product** - Products for sale (Declutter or Online Store types)
3. **Order** - Orders with status tracking (PENDING → PAID → PROCESSING → SHIPPED → DELIVERED → COMPLETED)
4. **Escrow** - Payment holding during disputes
5. **Complaint** - Buyer complaints/disputes

See [prisma/schema.prisma](prisma/schema.prisma) for full schema.

## AWS Deployment

See detailed deployment guide: [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)

### Quick Deploy Options:

**Option 1: AWS EC2 (Simple)**
```bash
# SSH into EC2, install Node.js & PostgreSQL
npm install && npm run build
pm2 start dist/main.js
```

**Option 2: AWS ECS with Docker (Scalable)**
```bash
docker build -t declutter-api .
# Push to ECR, deploy to ECS Fargate
```

**Option 3: AWS Elastic Beanstalk (Easiest)**
```bash
eb init && eb create && eb deploy
```

### Estimated Monthly Costs
- **EC2 (t3.medium):** ~$45/month
- **ECS Fargate (2 tasks):** ~$61/month
- **Elastic Beanstalk:** ~$45-60/month

## Migration Status

### ✅ Completed
- [x] Python codebase backup
- [x] NestJS project structure
- [x] Prisma ORM with PostgreSQL
- [x] Database models (User, Product, Order, Escrow, Complaint)
- [x] JWT authentication with role-based guards
- [x] Users module (profile, list)
- [x] Products module (CRUD, file uploads, Cloudinary)
- [x] Orders module (create, status updates, confirmation flow)
- [x] Payments module (Paystack initialization, verification, webhooks)
- [x] Cloudinary integration
- [x] WebSocket gateway for real-time notifications
- [x] Background tasks (escrow auto-release every 10 mins)
- [x] Docker configuration
- [x] AWS deployment guides

### ⏳ To Do (Optional)
- [ ] Admin module implementation (sales reports, user management)
- [ ] Seller module (statistics)
- [ ] Complaints module (dispute resolution)
- [ ] Unit & integration tests
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Rate limiting & security hardening
- [ ] Logging & monitoring (Winston, DataDog)
- [ ] CI/CD pipeline (GitHub Actions)

## Development

```bash
# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm run test

# Watch mode for tests
npm run test:watch

# Test coverage
npm run test:cov
```

## Docker

```bash
# Build Docker image
docker build -t declutter-api .

# Run with Docker Compose (includes PostgreSQL)
docker-compose up

# Access app at http://localhost:3000/api
```

## Troubleshooting

### npm permission errors (macOS)
```bash
sudo chown -R $(whoami) ~/.npm
```

### Database connection issues
- Ensure PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env`
- Verify database exists: `psql -l`

### Prisma migration errors
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or force push schema
npx prisma db push --force-reset
```

## Comparison: Python FastAPI vs NestJS

| Feature | Python/FastAPI | Node.js/NestJS |
|---------|----------------|----------------|
| **Language** | Python 3.x | TypeScript/JavaScript |
| **Framework** | FastAPI | NestJS |
| **ORM** | SQLAlchemy (async) | Prisma |
| **Validation** | Pydantic | class-validator |
| **Dependency Injection** | `Depends()` | `@Injectable()` |
| **Async Support** | asyncio | Native event loop |
| **WebSockets** | ASGI WebSockets | Socket.IO |
| **Task Scheduling** | APScheduler | @nestjs/schedule |
| **Scalability** | Good (Uvicorn workers) | Excellent (PM2 clusters, AWS) |
| **AWS Support** | Limited serverless | Excellent (Lambda, ECS, EB) |

## License

ISC

## Support

For issues or questions:
1. Check [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) for deployment help
2. Review Prisma schema for database questions
3. Check environment variables in [.env.example](.env.example)

---

**Migration completed successfully!**

Original Python codebase backed up at: `/Users/macintosh/Downloads/dback-python-backup-20251212`
