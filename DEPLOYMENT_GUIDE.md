# Blinkit Clone - Deployment Guide for Testing

This guide will help you deploy your Blinkit clone app for testing purposes.

## 🚀 Quick Deployment Options

### Option 1: Backend + Admin Panel (Recommended for Testing)

#### **Backend Deployment (Render.com - Free)**

1. **Sign up for Render.com** (free tier available)
2. **Connect your GitHub repository**
3. **Create a new Web Service:**
   - Source: Your GitHub repo
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     ```
     MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/blinkit_clone
     JWT_SECRET=your_secure_jwt_secret
     NODE_ENV=production
     PORT=3001
     CORS_ORIGIN=https://your-admin-panel-url.vercel.app
     ```

4. **Database Setup:**
   - Use MongoDB Atlas (free tier)
   - Create a cluster and get connection string
   - Update MONGODB_URI in environment variables

#### **Admin Panel Deployment (Vercel.com - Free)**

1. **Sign up for Vercel.com**
2. **Import your GitHub repository**
3. **Configure build settings:**
   - Framework Preset: Create React App
   - Root Directory: `admin-panel`
   - Build Command: `npm run build`
   - Output Directory: `build`

4. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```

5. **Update API URLs:**
   - Open `admin-panel/src/api/index.js`
   - Replace `http://10.0.0.74:3001` with your Render backend URL

### Option 2: Mobile App Testing

#### **Expo Development Build (Recommended)**

1. **Install EAS CLI:**
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS:**
   ```bash
   cd mobile-app
   eas build:configure
   ```

4. **Update API URLs:**
   - Open `mobile-app/src/api/index.js`
   - Replace localhost URLs with your deployed backend URL

5. **Build for testing:**
   ```bash
   # For Android
   eas build --platform android --profile preview
   
   # For iOS
   eas build --platform ios --profile preview
   ```

6. **Share the build:**
   - EAS will provide a QR code or download link
   - Share with testers

#### **Expo Go (Quick Testing)**

1. **Update API URLs in mobile app**
2. **Start Expo development server:**
   ```bash
   cd mobile-app
   npx expo start
   ```

3. **Share QR code with testers**
4. **Testers scan QR code with Expo Go app**

## 🔧 Required Configuration Changes

### Backend Configuration

1. **Update CORS settings in `backend/server.js`:**
   ```javascript
   app.use(cors({
     origin: ['https://your-admin-panel.vercel.app', 'exp://your-expo-url'],
     credentials: true
   }));
   ```

2. **Update image serving:**
   ```javascript
   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
   ```

### Mobile App Configuration

1. **Update API base URL in `mobile-app/src/api/index.js`:**
   ```javascript
   const BASE_URL = 'https://your-backend-url.onrender.com';
   ```

2. **Update image URLs to use HTTPS**

### Admin Panel Configuration

1. **Update API base URL in `admin-panel/src/api/index.js`:**
   ```javascript
   const BASE_URL = 'https://your-backend-url.onrender.com';
   ```

## 📱 Testing Checklist

### Backend Testing
- [ ] API endpoints respond correctly
- [ ] Database connections work
- [ ] File uploads function properly
- [ ] Authentication works
- [ ] CORS is configured correctly

### Admin Panel Testing
- [ ] Can view all products/categories/brands
- [ ] Can edit product information
- [ ] Can upload new images
- [ ] Authentication works
- [ ] Responsive design works

### Mobile App Testing
- [ ] Can browse products
- [ ] Can add items to cart
- [ ] Can complete checkout process
- [ ] Images load correctly
- [ ] Navigation works smoothly

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Check CORS configuration in backend
   - Ensure all frontend URLs are whitelisted

2. **Image Loading Issues:**
   - Verify image paths are using HTTPS
   - Check file permissions on server

3. **Database Connection:**
   - Verify MongoDB Atlas connection string
   - Check network access settings

4. **Build Failures:**
   - Check for missing dependencies
   - Verify environment variables

## 🔒 Security Considerations

1. **Environment Variables:**
   - Never commit `.env` files
   - Use secure JWT secrets
   - Rotate database passwords regularly

2. **API Security:**
   - Implement rate limiting
   - Validate all inputs
   - Use HTTPS in production

3. **File Uploads:**
   - Validate file types
   - Limit file sizes
   - Scan for malware

## 📊 Monitoring

1. **Backend Monitoring:**
   - Use Render's built-in logs
   - Monitor API response times
   - Track error rates

2. **Frontend Monitoring:**
   - Use Vercel Analytics
   - Monitor page load times
   - Track user interactions

## 🚀 Production Considerations

When ready for production:

1. **Use a production database**
2. **Implement proper logging**
3. **Set up monitoring and alerts**
4. **Use a CDN for images**
5. **Implement caching strategies**
6. **Set up automated backups**

---

**Need Help?** Check the logs in your deployment platform's dashboard for specific error messages. 