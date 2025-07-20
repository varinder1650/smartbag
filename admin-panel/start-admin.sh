#!/bin/bash

# Kill any existing react-scripts processes
echo "🔄 Killing existing react-scripts processes..."
pkill -f "react-scripts" 2>/dev/null

# Wait a moment
sleep 2

# Try different ports
for port in 3000 3002 3003 3004 3005; do
    echo "🚀 Trying to start admin panel on port $port..."
    
    # Check if port is available
    if ! lsof -i :$port >/dev/null 2>&1; then
        echo "✅ Port $port is available"
        
        # Start the admin panel
        PORT=$port npm start &
        
        # Wait for it to start
        sleep 10
        
        # Check if it's running
        if curl -s http://localhost:$port >/dev/null 2>&1; then
            echo "🎉 Admin panel started successfully on http://localhost:$port"
            echo "📊 You can now access the admin panel at: http://localhost:$port"
            exit 0
        else
            echo "❌ Failed to start on port $port"
            pkill -f "react-scripts" 2>/dev/null
        fi
    else
        echo "❌ Port $port is already in use"
    fi
done

echo "❌ Could not start admin panel on any available port"
exit 1 