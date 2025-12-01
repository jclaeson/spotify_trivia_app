#!/bin/bash

set -e

RESOURCE_GROUP="spotify-trivia-rg"
APP_NAME="guess-that-track-app"

echo "==================================="
echo "Azure Environment Configuration"
echo "==================================="
echo ""

read -p "Enter your Spotify Client ID: " SPOTIFY_CLIENT_ID
read -p "Enter your Spotify Client Secret: " SPOTIFY_CLIENT_SECRET

echo ""
echo "Generating secure session secret..."
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo ""
echo "Configuring environment variables..."

az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV="production" \
    PORT="8080" \
    SPOTIFY_CLIENT_ID="$SPOTIFY_CLIENT_ID" \
    SPOTIFY_CLIENT_SECRET="$SPOTIFY_CLIENT_SECRET" \
    SESSION_SECRET="$SESSION_SECRET" \
    ALLOWED_ORIGINS="https://${APP_NAME}.azurewebsites.net" \
    ALLOWED_REDIRECT_URIS="https://${APP_NAME}.azurewebsites.net/callback"

echo ""
echo "✓ Environment variables configured!"
echo ""
echo "IMPORTANT: Add this redirect URI to your Spotify App settings:"
echo "https://${APP_NAME}.azurewebsites.net/callback"
echo ""
echo "Visit: https://developer.spotify.com/dashboard"
echo ""
