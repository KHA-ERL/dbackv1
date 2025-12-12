#!/bin/bash

# Declutter NestJS Setup Script
# This script automates the initial setup process

set -e  # Exit on error

echo "🚀 Declutter NestJS Setup"
echo "========================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required. Current version: $(node -v)"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"
echo ""

# Check PostgreSQL
echo "🐘 Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  Warning: PostgreSQL not found in PATH"
    echo "Make sure PostgreSQL is installed and running"
else
    echo "✅ PostgreSQL detected"
fi
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Setup environment
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✅ .env created - Please edit with your credentials!"
    echo ""
    echo "📝 Required configuration:"
    echo "   - DATABASE_URL: Your PostgreSQL connection string"
    echo "   - JWT_SECRET: Strong secret for JWT tokens"
    echo "   - CLOUDINARY_*: Cloudinary API credentials"
    echo "   - PAYSTACK_SECRET_KEY: Paystack secret key"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate
echo "✅ Prisma client generated"
echo ""

# Ask about database migration
echo "🗄️  Database Setup"
read -p "Do you want to run database migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running migrations..."
    npm run prisma:migrate
    echo "✅ Database migrations completed"
else
    echo "⏭️  Skipping migrations. Run 'npm run prisma:migrate' later"
fi
echo ""

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads
echo "✅ Uploads directory created"
echo ""

# Success message
echo "✅ Setup Complete!"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Edit .env file with your credentials:"
echo "   nano .env"
echo ""
echo "2. Run database migrations (if not done yet):"
echo "   npm run prisma:migrate"
echo ""
echo "3. Start development server:"
echo "   npm run start:dev"
echo ""
echo "4. Access API at:"
echo "   http://localhost:3000/api"
echo ""
echo "5. View database with Prisma Studio:"
echo "   npm run prisma:studio"
echo ""
echo "📖 Read the documentation:"
echo "   - README.md - Installation & API docs"
echo "   - AWS_DEPLOYMENT.md - AWS deployment guides"
echo "   - MIGRATION_SUMMARY.md - Migration details"
echo ""
echo "🎉 Happy coding!"
