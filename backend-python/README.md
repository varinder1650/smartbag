# Blinkit Clone - Python FastAPI Backend

This is the Python FastAPI backend for the Blinkit Clone application, converted from the original Node.js/Express backend.

## Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **MongoDB Integration**: Async MongoDB operations with Motor
- **JWT Authentication**: Secure token-based authentication
- **File Upload**: Image upload functionality with validation
- **Google Maps Integration**: Address search, geocoding, and validation
- **Rate Limiting**: API rate limiting with SlowAPI
- **CORS Support**: Cross-origin resource sharing enabled
- **Comprehensive API**: Complete REST API for all app features

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get product by ID
- `POST /api/products` - Create product (admin)
- `PUT /api/products/{id}` - Update product (admin)
- `DELETE /api/products/{id}` - Delete product (admin)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/{id}` - Update category (admin)
- `DELETE /api/categories/{id}` - Delete category (admin)

### Brands
- `GET /api/brands` - Get all brands
- `POST /api/brands` - Create brand (admin)
- `PUT /api/brands/{id}` - Update brand (admin)
- `DELETE /api/brands/{id}` - Delete brand (admin)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove/{product_id}` - Remove item from cart
- `DELETE /api/cart/clear` - Clear cart

### Orders
- `GET /api/orders` - Get orders (admin) or user orders
- `GET /api/orders/my` - Get current user's orders
- `GET /api/orders/{id}` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/{id}/status` - Update order status (admin)

### Settings
- `GET /api/settings/public` - Get public settings (mobile app)
- `GET /api/settings` - Get settings (admin)
- `PUT /api/settings` - Update settings (admin)

### Address
- `GET /api/address/search` - Search addresses
- `POST /api/address/geocode` - Geocode address
- `POST /api/address/validate` - Validate address
- `POST /api/address/reverse-geocode` - Reverse geocoding

### User
- `GET /api/user/address` - Get user address
- `POST /api/user/address` - Save user address
- `PUT /api/user/address` - Update user address

### Upload
- `POST /api/upload/images` - Upload images
- `DELETE /api/upload/images/{filename}` - Delete image

## Setup Instructions

### Prerequisites

- Python 3.8+
- MongoDB
- Google Maps API Key (for address features)

### Installation

1. **Clone the repository**
   ```bash
   cd backend-python
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   Create a `.env` file with the following variables:
   ```env
   MONGO_URI=mongodb://localhost:27017/blinkit_clone
   JWT_SECRET_KEY=your-secret-key-here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   PORT=3001
   ENVIRONMENT=development
   ```

5. **Start MongoDB**
   Make sure MongoDB is running on your system.

6. **Run the server**
   ```bash
   python main.py
   ```

   Or using uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 3001 --reload
   ```

### Testing

Run the test script to verify the backend is working:
```bash
python test_server.py
```

## Database Schema

### Collections

- **users**: User accounts and profiles
- **products**: Product catalog
- **categories**: Product categories
- **brands**: Product brands
- **carts**: User shopping carts
- **orders**: Customer orders
- **settings**: Application settings

### Key Features

- **Stock Management**: Automatic stock decrement on order placement
- **Image Handling**: Secure file upload with validation
- **Address Validation**: Google Maps integration for address verification
- **Order Tracking**: Status change history for orders
- **Settings Management**: Dynamic app configuration

## API Documentation

Once the server is running, you can access:
- **Interactive API Docs**: http://localhost:3001/docs
- **ReDoc Documentation**: http://localhost:3001/redoc

## Migration from Node.js

This Python backend maintains full compatibility with the original Node.js backend:

- Same API endpoints and request/response formats
- Identical database schema
- Same authentication flow
- Compatible with existing mobile app and admin panel

## Development

### Project Structure
```
backend-python/
├── main.py              # FastAPI application entry point
├── requirements.txt     # Python dependencies
├── models/             # Pydantic models
├── routes/             # API route handlers
├── utils/              # Utility functions
├── uploads/            # File upload directory
└── test_server.py      # Test script
```

### Adding New Features

1. Create Pydantic models in `models/`
2. Add route handlers in `routes/`
3. Update `main.py` to include new routes
4. Add tests to `test_server.py`

## Deployment

### Production Setup

1. Set `ENVIRONMENT=production` in `.env`
2. Use a production ASGI server like Gunicorn:
   ```bash
   pip install gunicorn
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

3. Set up reverse proxy (nginx) for static files and SSL
4. Configure MongoDB for production
5. Set secure JWT secret and other environment variables

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MONGO_URI in .env file

2. **Import Errors**
   - Activate virtual environment
   - Install missing dependencies: `pip install -r requirements.txt`

3. **File Upload Issues**
   - Ensure `uploads/` directory exists
   - Check file permissions

4. **Google Maps API Errors**
   - Verify GOOGLE_MAPS_API_KEY is set
   - Check API key permissions and quotas

## License

This project is part of the Blinkit Clone application. 