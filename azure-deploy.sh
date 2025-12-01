#!/bin/bash

set -e

RESOURCE_GROUP="spotify-trivia-rg"
APP_NAME="guess-that-track-app"

echo "==================================="
echo "Azure App Service Deployment Script"
echo "==================================="
echo ""

if [ ! -d "static-build" ]; then
    echo "❌ Error: static-build folder not found!"
    echo "Run 'npx expo export -p web --output-dir static-build' first"
    exit 1
fi

echo "✓ static-build folder found"
echo ""

echo "Creating deployment package..."
zip -r deploy.zip \
    server.js \
    package.json \
    package-lock.json \
    static-build \
    -x "*.git*" \
    -x "node_modules/*" \
    -x ".expo/*" \
    -x "k8s/*" \
    -x "Dockerfile*" \
    -x ".dockerignore"

echo "✓ Deployment package created: deploy.zip"
ls -lh deploy.zip
echo ""

echo "Verifying package contents..."
unzip -l deploy.zip | grep -E "(server.js|package.json|static-build)" | head -10
echo ""

echo "Starting Azure web app (if stopped)..."
az webapp start --name $APP_NAME --resource-group $RESOURCE_GROUP 2>/dev/null || true
echo ""

echo "Deploying to Azure..."
az webapp deploy \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --src-path deploy.zip \
    --type zip

echo ""
echo "==================================="
echo "✓ Deployment complete!"
echo "==================================="
echo ""
echo "App URL: https://${APP_NAME}.azurewebsites.net"
echo ""
echo "Next steps:"
echo "1. Set environment variables (see AZURE_DEPLOY.md for commands)"
echo "2. Configure Spotify redirect URI in Spotify Developer Dashboard:"
echo "   https://${APP_NAME}.azurewebsites.net/callback"
echo ""
