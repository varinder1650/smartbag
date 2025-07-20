#!/bin/bash

# Start Expo development server with options to avoid simulator issues
echo "Starting Expo development server..."

# Clear cache and start
npx expo start --clear --tunnel

# Alternative options if tunnel doesn't work:
# npx expo start --clear --web
# npx expo start --clear --android
# npx expo start --clear --ios --no-dev-client 