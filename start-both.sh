#!/bin/bash

# Start Expo dev server on port 8082
echo "Starting Expo on port 8082..."
EXPO_PACKAGER_PROXY_URL=https://$REPLIT_DEV_DOMAIN REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_DEV_DOMAIN npx expo start --port 8082 &
EXPO_PID=$!

# Wait for Expo to start
sleep 8

# Start backend proxy server on port 8081 (which proxies to Expo)
echo "Starting OAuth backend proxy on port 8081..."
PORT=8081 node server.js &
BACKEND_PID=$!

echo "Both servers started:"
echo "  - Expo: http://localhost:8082"
echo "  - Backend (with proxy): http://localhost:8081"
echo ""
echo "Access the app at the external URL (port :80)"

# Wait for both processes
wait $EXPO_PID $BACKEND_PID
