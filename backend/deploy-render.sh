#!/bin/bash

echo "🚀 SmartBag Backend Deployment Script for Render"
echo "================================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first."
    exit 1
fi

# Check if all files are committed
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Please commit them first:"
    git status
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Repository is ready for deployment"
echo ""

echo "📋 Prerequisites Checklist:"
echo "1. MongoDB Atlas account and connection string"
echo "2. Render account (render.com)"
echo "3. GitHub repository connected to Render"
echo ""

read -p "Have you completed the prerequisites? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please complete the prerequisites first:"
    echo "1. Go to https://www.mongodb.com/atlas and create free account"
    echo "2. Go to https://render.com and sign up"
    echo "3. Connect your GitHub repository to Render"
    exit 1
fi

echo ""
echo "🔧 Environment Variables Setup:"
echo "You'll need to set these in Render dashboard:"
echo ""
echo "MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smartbag?retryWrites=true&w=majority"
echo "JWT_SECRET=your-super-secret-jwt-key-here"
echo "ENVIRONMENT=production"
echo "PORT=10000"
echo ""

echo "📝 Render Deployment Steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure the service:"
echo "   - Name: smartbag-backend"
echo "   - Environment: Python 3"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: uvicorn main:app --host 0.0.0.0 --port \$PORT"
echo "5. Add environment variables (see above)"
echo "6. Click 'Create Web Service'"
echo ""

echo "🔄 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment files are ready!"
echo "📖 See backend/DEPLOYMENT_GUIDE.md for detailed instructions"
echo "🌐 Your API will be available at: https://your-app-name.onrender.com"
echo ""
echo "🎉 Happy Deploying!" 