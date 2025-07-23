#!/bin/bash

# Restart Expo with debugging enabled
# This script clears the cache and enables debugging for the Expo development server

echo "===== SMARTBAG APP DEBUGGING SCRIPT ====="
echo "This script will restart the Expo development server with debugging enabled"
echo ""

# Kill any running Expo processes
echo "Stopping any running Expo processes..."
pkill -f "expo start"

# Clear Metro bundler cache
echo "Clearing Metro bundler cache..."
rm -rf $TMPDIR/metro-*
rm -rf node_modules/.cache

# Clear Expo cache
echo "Clearing Expo cache..."
npx expo start --clear --no-dev --minify

# Restart with debugging enabled
echo "Restarting Expo with debugging enabled..."
EXPO_DEBUG=true npx expo start --clear