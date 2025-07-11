#!/bin/bash

echo "🚀 Blinkit Clone - Deployment Setup Script"
echo "=========================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if remote is set
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote repository found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/your-repo-name.git"
    echo "   git push -u origin main"
    exit 1
fi

echo "✅ Git repository is properly configured"

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore file..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
build/
dist/
.next/
out/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Expo
.expo/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/

# macOS
.DS_Store

# Windows
Thumbs.db
ehthumbs.db
Desktop.ini

# Uploads (keep the directory but ignore contents)
uploads/*
!uploads/.gitkeep
EOF
    echo "✅ .gitignore created"
fi

# Check for .env files
echo "🔍 Checking for environment files..."
find . -name ".env*" -type f | while read file; do
    echo "⚠️  Found: $file"
    echo "   Make sure this file is in .gitignore and contains no sensitive data"
done

# Check backend configuration
echo "🔧 Checking backend configuration..."
if [ -f "backend/server.js" ]; then
    echo "✅ Backend server file found"
else
    echo "❌ Backend server file not found"
fi

if [ -f "backend/package.json" ]; then
    echo "✅ Backend package.json found"
else
    echo "❌ Backend package.json not found"
fi

# Check admin panel configuration
echo "🔧 Checking admin panel configuration..."
if [ -f "admin-panel/package.json" ]; then
    echo "✅ Admin panel package.json found"
else
    echo "❌ Admin panel package.json not found"
fi

# Check mobile app configuration
echo "🔧 Checking mobile app configuration..."
if [ -f "mobile-app/package.json" ]; then
    echo "✅ Mobile app package.json found"
else
    echo "❌ Mobile app package.json not found"
fi

if [ -f "mobile-app/app.json" ]; then
    echo "✅ Mobile app app.json found"
else
    echo "❌ Mobile app app.json not found"
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. 🗄️  Set up MongoDB Atlas:"
echo "   - Go to https://cloud.mongodb.com"
echo "   - Create a free cluster"
echo "   - Get your connection string"
echo ""
echo "2. 🚀 Deploy Backend (Render.com):"
echo "   - Go to https://render.com"
echo "   - Connect your GitHub repo"
echo "   - Create Web Service from backend/ directory"
echo "   - Set environment variables (see DEPLOYMENT_GUIDE.md)"
echo ""
echo "3. 🌐 Deploy Admin Panel (Vercel.com):"
echo "   - Go to https://vercel.com"
echo "   - Import your GitHub repo"
echo "   - Set root directory to admin-panel/"
echo "   - Update API URLs to point to your backend"
echo ""
echo "4. 📱 Deploy Mobile App:"
echo "   - Update API URLs in mobile-app/src/api/index.js"
echo "   - Use Expo EAS Build or Expo Go for testing"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 Setup complete! Ready for deployment." 