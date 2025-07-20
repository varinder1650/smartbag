# 🚀 SmartBag Backend Deployment Guide

## 📋 Prerequisites

1. **MongoDB Atlas Account** (Free tier)
2. **GitHub Repository** with your code
3. **Environment Variables** ready

## 🗄️ MongoDB Atlas Setup

### 1. Create MongoDB Atlas Account
- Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
- Sign up for free account
- Create a new cluster (M0 Free tier)

### 2. Get Connection String
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string
- Replace `<password>` with your database password
- Replace `<dbname>` with `smartbag`

Example:
```
mongodb+srv://username:password@cluster.mongodb.net/smartbag?retryWrites=true&w=majority
```

## 🎯 Deployment Options

### Option 1: Render (Recommended)

#### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Verify your email

#### Step 2: Deploy Backend
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:

```
Name: smartbag-backend
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

#### Step 3: Environment Variables
Add these in Render dashboard:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smartbag?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here
ENVIRONMENT=production
PORT=10000
```

#### Step 4: Deploy
- Click "Create Web Service"
- Wait for deployment (2-3 minutes)
- Your API will be available at: `https://your-app-name.onrender.com`

### Option 2: Fly.io

#### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login
```bash
fly auth login
```

#### Step 3: Deploy
```bash
cd backend
fly launch
```

#### Step 4: Set Environment Variables
```bash
fly secrets set MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/smartbag?retryWrites=true&w=majority"
fly secrets set JWT_SECRET="your-super-secret-jwt-key-here"
fly secrets set ENVIRONMENT="production"
```

#### Step 5: Deploy
```bash
fly deploy
```

### Option 3: Railway

#### Step 1: Create Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

#### Step 2: Deploy
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway will auto-detect Python

#### Step 3: Environment Variables
Add in Railway dashboard:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smartbag?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here
ENVIRONMENT=production
PORT=3001
```

### Option 4: Vercel (Serverless)

#### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

#### Step 2: Deploy
```bash
cd backend
vercel
```

#### Step 3: Environment Variables
Add in Vercel dashboard or during deployment.

## 🔧 Environment Variables

### Required Variables
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smartbag?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here
ENVIRONMENT=production
PORT=8080
```

### Optional Variables
```env
# For additional security
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ORIGINS=https://your-frontend-domain.com
```

## 🧪 Testing Deployment

### 1. Health Check
```bash
curl https://your-app-url.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "message": "Backend is running successfully"
}
```

### 2. API Documentation
Visit: `https://your-app-url.com/docs`

### 3. Create Test User
```bash
curl -X POST https://your-app-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "password123"
  }'
```

## 🔄 Continuous Deployment

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Render
      env:
        RENDER_TOKEN: ${{ secrets.RENDER_TOKEN }}
        RENDER_SERVICE_ID: ${{ secrets.RENDER_SERVICE_ID }}
      run: |
        curl -X POST "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
          -H "Authorization: Bearer $RENDER_TOKEN" \
          -H "Content-Type: application/json"
```

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
- Check if MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify connection string format
- Ensure database user has correct permissions

#### 2. Port Issues
- Make sure to use `$PORT` environment variable
- Check if platform requires specific port

#### 3. Build Failures
- Verify all dependencies in `requirements.txt`
- Check Python version compatibility
- Ensure all files are committed to GitHub

#### 4. Environment Variables
- Double-check variable names (case-sensitive)
- Ensure no extra spaces or quotes
- Verify MongoDB URI format

### Debug Commands

#### Check Logs
```bash
# Render
# Check in Render dashboard

# Fly.io
fly logs

# Railway
# Check in Railway dashboard
```

#### Test Locally
```bash
# Test with production environment
ENVIRONMENT=production MONGO_URI=your_atlas_uri python main.py
```

## 📊 Monitoring

### Health Monitoring
- Set up health check endpoints
- Monitor response times
- Check error rates

### Database Monitoring
- Monitor MongoDB Atlas metrics
- Check connection pool usage
- Watch for slow queries

## 🔒 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong JWT secrets
   - Rotate secrets regularly

2. **CORS Configuration**
   - Limit allowed origins
   - Use HTTPS in production

3. **Rate Limiting**
   - Already implemented in code
   - Monitor for abuse

4. **Input Validation**
   - All endpoints validate input
   - Use Pydantic models

## 🚀 Next Steps

After deployment:

1. **Update Frontend URLs**
   - Update API base URL in mobile app
   - Update API base URL in admin panel

2. **Test All Features**
   - User registration/login
   - Product browsing
   - Cart operations
   - Order placement

3. **Set Up Monitoring**
   - Health checks
   - Error tracking
   - Performance monitoring

4. **Domain Setup (Optional)**
   - Configure custom domain
   - Set up SSL certificates
   - Configure DNS

## 📞 Support

If you encounter issues:

1. Check platform-specific documentation
2. Review application logs
3. Test locally with production settings
4. Verify environment variables
5. Check MongoDB Atlas connection

---

**Happy Deploying! 🎉** 