# Deploy to Azure App Service

This guide walks you through deploying your Spotify Trivia app to Azure App Service - a simple, cost-effective alternative to Kubernetes.

## Quick Start (Using Provided Scripts)

If you've already created your Azure resources, use these scripts for quick deployment:

```bash
# 1. Start the web app (if stopped)
az webapp start --name guess-that-track-app --resource-group spotify-trivia-rg

# 2. Clear any bad startup command
az webapp config set --name guess-that-track-app --resource-group spotify-trivia-rg --startup-file ""

# 3. Run the environment setup script (first time only)
./azure-setup-env.sh

# 4. Deploy using the deployment script
./azure-deploy.sh
```

**Important:** Your `static-build` folder must exist before deploying. If it doesn't:
```bash
npx expo export -p web --output-dir static-build
```

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- Azure account with active subscription
- Git installed on your machine

## Cost

**Azure App Service Basic B1**: ~$13/month
- 1.75 GB RAM
- 1 CPU core
- Always-on (no cold starts)
- Custom domain + SSL support
- Perfect for small demos and prototypes

## Architecture

This deployment runs everything in a single App Service instance:
- **Express backend** handles Spotify OAuth (`/api`, `/callback`)
- **Static web files** serve your Expo web app (`/`)
- **One domain** for everything with automatic HTTPS

## Step 1: Login to Azure

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account list --output table
az account set --subscription "<your-subscription-id>"

# Set variables
RESOURCE_GROUP="spotify-trivia-rg"
APP_NAME="guess-that-track-app"  # Must be globally unique
LOCATION="eastus"
```

## Step 2: Create Resource Group and App Service Plan

```bash
# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (Basic B1 tier)
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# Create the Web App with Node.js 20 runtime
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan "${APP_NAME}-plan" \
  --runtime "NODE:20-lts"
```

## Step 3: Configure Environment Variables

Set up your Spotify credentials and app configuration:

```bash
# Set Spotify credentials (replace with your actual values)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV="production" \
    PORT="8080" \
    SPOTIFY_CLIENT_ID="your-spotify-client-id" \
    SPOTIFY_CLIENT_SECRET="your-spotify-client-secret" \
    SESSION_SECRET="your-random-session-secret" \
    ALLOWED_ORIGINS="https://${APP_NAME}.azurewebsites.net" \
    ALLOWED_REDIRECT_URIS="https://${APP_NAME}.azurewebsites.net/callback"
```

**To generate a secure SESSION_SECRET:**
```bash
# macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 4: Configure Startup Command (Optional - Usually Not Needed)

Azure App Service automatically runs `npm install --production` before starting your app. You typically **don't need** to set a custom startup command.

**Only if needed**, you can customize the startup:

```bash
# Let Azure use the default (recommended)
# This automatically runs: npm install --production && npm start (or node server.js)

# OR, if you need custom startup logic:
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "node server.js"
```

**Important:** Do NOT include `npm install` in the startup command - it runs automatically and will cause the app to timeout if run twice.

## Step 5: Build Your Web Application

**IMPORTANT**: You must rebuild the web bundle before each deployment to include your latest changes.

```bash
# Build the Expo web bundle
npx expo export -p web --output-dir static-build

# Verify the build succeeded
ls -lh static-build/
```

This creates the `static-build/` folder with your production-ready web app. Run this command **every time** you make frontend changes before deploying.

## Step 6: Deploy Your Application

**Before deploying**, ensure:
- You're in the project root directory
- The `static-build/` folder exists (from Step 5)
- All necessary files are ready to be included

### Option A: Deploy from Local Git

```bash
# Add the static-build folder to git
# (If static-build is in .gitignore, remove it or force-add it)
git add static-build/
git add server.js package.json package-lock.json .deployment
git commit -m "Deploy to Azure App Service"

# Configure local git deployment
az webapp deployment source config-local-git \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Get deployment URL
GIT_URL=$(az webapp deployment source config-local-git \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query url --output tsv)

# Add Azure as a git remote
git remote add azure $GIT_URL

# Deploy (will prompt for deployment credentials)
git push azure main
```

### Option B: Deploy from ZIP (Recommended)

```bash
# Create deployment package (run from project root)
zip -r deploy.zip . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x ".expo/*" \
  -x "k8s/*" \
  -x "Dockerfile*" \
  -x ".dockerignore"

# Verify static-build is included
unzip -l deploy.zip | grep static-build

# Deploy the ZIP
az webapp deploy \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src-path deploy.zip \
  --type zip

# Clean up
rm deploy.zip
```

## Step 7: Update Spotify Redirect URIs

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your application
3. Click "Edit Settings"
4. Add to Redirect URIs:
   ```
   https://<your-app-name>.azurewebsites.net/callback
   ```
5. Save changes

## Step 8: Access Your Application

```bash
# Get your app URL
echo "Your app is available at: https://${APP_NAME}.azurewebsites.net"

# Open in browser
az webapp browse --name $APP_NAME --resource-group $RESOURCE_GROUP
```

## Monitoring and Logs

### View Application Logs

```bash
# Enable application logging
az webapp log config \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --level information

# Stream logs in real-time
az webapp log tail \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

### View Deployment Logs

```bash
# Check deployment status
az webapp deployment list-publishing-credentials \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

## Updating Your Application

After making code changes:

```bash
# Step 1: Rebuild the web bundle (if you changed frontend code)
npx expo export -p web --output-dir static-build

# Step 2: Deploy

# Option 1: Git push
git add .
git commit -m "Update app"
git push azure main

# Option 2: ZIP deploy
zip -r deploy.zip . -x "*.git*" -x "node_modules/*" -x ".expo/*" -x "k8s/*"
az webapp deploy \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src-path deploy.zip \
  --type zip
```

**Pro Tip**: Create a deployment script to avoid forgetting the build step:

```bash
#!/bin/bash
# deploy.sh - Run from project root
set -e

# Configuration
APP_NAME="guess-that-track-app"
RESOURCE_GROUP="spotify-trivia-rg"

echo "Building web bundle..."
npx expo export -p web --output-dir static-build

echo "Creating deployment package..."
zip -r deploy.zip . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x ".expo/*" \
  -x "k8s/*" \
  -x "Dockerfile*" \
  -x ".dockerignore"

echo "Verifying static-build is included..."
if unzip -l deploy.zip | grep -q static-build; then
  echo "✓ static-build folder found in package"
else
  echo "✗ ERROR: static-build folder missing from package!"
  exit 1
fi

echo "Deploying to Azure..."
az webapp deploy \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src-path deploy.zip \
  --type zip

echo "Cleaning up..."
rm deploy.zip

echo "Deployment complete!"
echo "View logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "Access app: https://${APP_NAME}.azurewebsites.net"
```

Make it executable: `chmod +x deploy.sh`

## Custom Domain (Optional)

To use your own domain:

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname yourdomain.com

# Enable HTTPS with managed certificate
az webapp config ssl bind \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --certificate-thumbprint auto \
  --ssl-type SNI
```

## Troubleshooting

### Error: Web App is Stopped (403)

If you get a 403 error saying "This web app is stopped":

```bash
# Start the web app
az webapp start --name $APP_NAME --resource-group $RESOURCE_GROUP

# Verify it's running
az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query state
```

### Error: Site Failed to Start Within 10 Minutes

This usually means the app crashed during startup. Check the logs:

```bash
# View real-time logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Or view deployment logs in browser
# https://<app-name>.scm.azurewebsites.net/api/logs/docker
```

**Common causes:**
1. **Missing static-build folder** - Verify your deploy.zip includes it:
   ```bash
   unzip -l deploy.zip | grep static-build
   ```
   If empty, rebuild before deploying:
   ```bash
   npx expo export -p web --output-dir static-build
   ```

2. **Wrong startup command** - Should NOT run `npm install` in the startup command (it runs automatically):
   ```bash
   # Remove startup command to use default
   az webapp config set --name $APP_NAME --resource-group $RESOURCE_GROUP --startup-file ""
   ```

3. **Missing environment variables** - Check they're all set:
   ```bash
   az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP
   ```

4. **Port binding issues** - Ensure server.js binds to `0.0.0.0`, not `localhost`:
   ```javascript
   app.listen(PORT, '0.0.0.0', () => { ... });
   ```

### App Won't Start

Check logs:
```bash
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
```

Common issues:
- Missing environment variables
- Wrong Node.js version
- Missing static-build folder
- Server not binding to 0.0.0.0

### OAuth Redirect Error

1. Verify redirect URI in Spotify Dashboard matches exactly: `https://<app-name>.azurewebsites.net/callback`
2. Check ALLOWED_REDIRECT_URIS environment variable
3. Ensure HTTPS (not HTTP)

### Performance Issues

Upgrade to higher tier:
```bash
az appservice plan update \
  --name "${APP_NAME}-plan" \
  --resource-group $RESOURCE_GROUP \
  --sku S1  # Standard tier
```

## Clean Up Resources

To delete everything and stop billing:

```bash
# Delete the entire resource group
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

## Cost Management

Monitor your spending:
```bash
# View cost analysis
az consumption usage list --output table
```

Set up budget alerts in the Azure Portal to avoid surprises.

## Next Steps

- Set up continuous deployment with GitHub Actions
- Add custom domain and SSL
- Configure application insights for monitoring
- Set up staging slots for testing before production

## Support

- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Node.js on App Service](https://docs.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
