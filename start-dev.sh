#!/bin/bash

# Start Expo dev server on port 8082
EXPO_PACKAGER_PROXY_URL=https://$REPLIT_DEV_DOMAIN REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_DEV_DOMAIN PORT=8082 npx expo start --port 8082 &

# Wait for Expo to start
echo "Waiting for Expo dev server to start..."
sleep 5

# Start backend proxy server on port 8081
PORT=8081 node server.js
