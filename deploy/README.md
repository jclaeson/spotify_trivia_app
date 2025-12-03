# Azure Deployment Package

This folder contains everything needed to deploy the Spotify Trivia app to Azure App Service.

## Contents

- `server.js` - Production-optimized Express server (no dev dependencies)
- `package.json` - Minimal dependencies (just express and cors)
- `static-build/` - Pre-built Expo web bundle
- `azure-deploy.sh` - Deployment script

## Why This Approach?

The main project has 40+ dependencies (Expo, React Native, etc.) that are only needed for development. Installing all of these on Azure's Free tier causes a timeout.

This deploy folder contains only what's needed to run in production:
- **2 dependencies** instead of 40+
- **~3MB package** instead of 200MB+
- **Installs in seconds** instead of 10+ minutes

## Deployment Steps

### 1. First-time setup (set environment variables)

```bash
az webapp config appsettings set \
  --name guess-that-track-app \
  --resource-group spotify-trivia-rg \
  --settings \
    NODE_ENV="production" \
    PORT="8080" \
    SPOTIFY_CLIENT_ID="your-spotify-client-id" \
    ALLOWED_ORIGINS="https://guess-that-track-app.azurewebsites.net" \
    ALLOWED_REDIRECT_URIS="https://guess-that-track-app.azurewebsites.net/callback"
```

### 2. Deploy

```bash
cd deploy
./azure-deploy.sh
```

### 3. Add Spotify Redirect URI

In Spotify Developer Dashboard, add:
```
https://guess-that-track-app.azurewebsites.net/callback
```

## Updating the App

When you make changes to the frontend:

1. From the project root, rebuild the web bundle:
   ```bash
   npx expo export -p web --output-dir static-build
   ```

2. Copy to deploy folder:
   ```bash
   rm -rf deploy/static-build
   cp -r static-build deploy/
   ```

3. Deploy:
   ```bash
   cd deploy
   ./azure-deploy.sh
   ```

## Troubleshooting

### Check app status
```bash
az webapp show --name guess-that-track-app --resource-group spotify-trivia-rg --query state
```

### View logs
```bash
az webapp log tail --name guess-that-track-app --resource-group spotify-trivia-rg
```

### Restart app
```bash
az webapp restart --name guess-that-track-app --resource-group spotify-trivia-rg
```
