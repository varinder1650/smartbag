#!/bin/bash

# Blinkit Clone - FastAPI Backend Startup Script

echo "🚀 Starting Blinkit Clone FastAPI Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating default .env file..."
    cat > .env << EOF
MONGO_URI=mongodb://localhost:27017/blinkit_clone
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
PORT=3001
ENVIRONMENT=development
EOF
    echo "📝 Please update the .env file with your actual configuration values."
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Start the server
echo "🌐 Starting FastAPI server on http://localhost:3001"
echo "📚 API Documentation will be available at http://localhost:3001/docs"
echo "🔍 ReDoc Documentation will be available at http://localhost:3001/redoc"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python main.py 