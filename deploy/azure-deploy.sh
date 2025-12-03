#!/bin/bash

set -e

RESOURCE_GROUP="spotify-trivia-rg"
APP_NAME="guess-that-track-app"

echo "============================================"
echo "Azure App Service Deployment (Minimal Build)"
echo "============================================"
echo ""

if [ ! -d "static-build" ]; then
    echo "Error: static-build folder not found!"
    echo "Make sure you're in the deploy/ directory"
    exit 1
fi

echo "Step 1: Creating deployment package..."
rm -f deploy.zip

zip -r deploy.zip \
    server.js \
    package.json \
    static-build/

echo ""
echo "Package contents:"
unzip -l deploy.zip | head -20
echo ""

PACKAGE_SIZE=$(ls -lh deploy.zip | awk '{print $5}')
echo "Package size: $PACKAGE_SIZE"
echo ""

echo "Step 2: Starting web app (if stopped)..."
az webapp start --name $APP_NAME --resource-group $RESOURCE_GROUP 2>/dev/null || echo "App may already be running"
echo ""

echo "Step 3: Deploying to Azure..."
az webapp deploy \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --src-path deploy.zip \
    --type zip

echo ""
echo "============================================"
echo "Deployment complete!"
echo "============================================"
echo ""
echo "App URL: https://${APP_NAME}.azurewebsites.net"
echo ""
echo "To view logs:"
echo "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
