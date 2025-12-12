# AWS Deployment Guide

This guide covers multiple ways to deploy your NestJS application to AWS.

## Prerequisites

- AWS Account
- AWS CLI installed and configured
- Docker installed (for ECS deployment)

## Option 1: AWS EC2 (Traditional VPS)

### Step 1: Launch EC2 Instance

```bash
# Launch Ubuntu 22.04 LTS instance
# Recommended: t3.medium or larger
# Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (app)
```

### Step 2: Connect and Setup

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Step 3: Setup PostgreSQL

```bash
sudo -u postgres psql

CREATE DATABASE declutter;
CREATE USER declutteruser WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE declutter TO declutteruser;
\q
```

### Step 4: Deploy Application

```bash
# Clone or upload your code
git clone your-repo-url
cd dback-nestjs

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Edit with your AWS RDS or local PostgreSQL credentials

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Build application
npm run build

# Start with PM2
pm2 start dist/main.js --name declutter-api
pm2 startup
pm2 save
```

### Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/declutter

# Add this configuration:
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/declutter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Option 2: AWS ECS with Fargate (Recommended for Scalability)

### Step 1: Create ECR Repository

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create repository
aws ecr create-repository --repository-name declutter-api --region us-east-1

# Build and push Docker image
docker build -t declutter-api .
docker tag declutter-api:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/declutter-api:latest
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/declutter-api:latest
```

### Step 2: Setup RDS PostgreSQL

```bash
# Create RDS PostgreSQL instance via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier declutter-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-XXXXXXXX
```

### Step 3: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name declutter-cluster

# Create task definition (task-definition.json)
```

```json
{
  "family": "declutter-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "declutter-api",
      "image": "YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/declutter-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://user:pass@your-rds-endpoint:5432/declutter"
        },
        {
          "name": "JWT_SECRET",
          "value": "your-jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/declutter-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster declutter-cluster \
  --service-name declutter-api-service \
  --task-definition declutter-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Step 4: Setup Application Load Balancer

- Create ALB via AWS Console
- Configure target group (port 3000)
- Add listeners (HTTP/HTTPS)
- Attach to ECS service

---

## Option 3: AWS Elastic Beanstalk (Easiest)

### Step 1: Install EB CLI

```bash
pip install awsebcli
```

### Step 2: Initialize and Deploy

```bash
# Initialize Elastic Beanstalk
eb init -p node.js-20 declutter-api --region us-east-1

# Create environment
eb create declutter-production

# Deploy
eb deploy

# Open in browser
eb open
```

### Step 3: Configure Environment Variables

```bash
# Set environment variables
eb setenv \
  NODE_ENV=production \
  DATABASE_URL=your-database-url \
  JWT_SECRET=your-jwt-secret \
  CLOUDINARY_CLOUD_NAME=your-cloudinary-name \
  CLOUDINARY_API_KEY=your-api-key \
  CLOUDINARY_API_SECRET=your-api-secret \
  PAYSTACK_SECRET_KEY=your-paystack-key
```

---

## Cost Estimates (Monthly)

### EC2 (t3.medium)
- EC2 instance: ~$30
- RDS db.t3.micro: ~$15
- **Total: ~$45/month**

### ECS Fargate (2 tasks)
- Fargate compute: ~$30
- RDS db.t3.micro: ~$15
- Load Balancer: ~$16
- **Total: ~$61/month**

### Elastic Beanstalk
- Similar to EC2 costs
- **Total: ~$45-60/month**

---

## Post-Deployment

### Setup CloudWatch Monitoring

```bash
# View logs
aws logs tail /ecs/declutter-api --follow

# Or for EC2
pm2 logs
```

### Setup Auto-Scaling (ECS)

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/declutter-cluster/declutter-api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10
```

### Database Migrations

```bash
# For EC2/EB
npm run prisma:migrate

# For ECS, run as a one-time task or in CI/CD
```

---

## Security Checklist

- [ ] Use AWS Secrets Manager for sensitive credentials
- [ ] Enable AWS WAF for API protection
- [ ] Setup VPC with private subnets for RDS
- [ ] Use security groups to restrict access
- [ ] Enable CloudWatch alarms for monitoring
- [ ] Setup automated backups for RDS
- [ ] Use HTTPS only (SSL/TLS)
- [ ] Implement rate limiting
- [ ] Enable CloudTrail for audit logs

---

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: declutter-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster declutter-cluster --service declutter-api-service --force-new-deployment
```

---

For questions or issues, check the AWS documentation or contact support.
