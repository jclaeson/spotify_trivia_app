# Guess That Track - Spotify Trivia Game

## Overview
An interactive music trivia game built with Expo React Native that challenges users to identify songs from short audio previews. The app integrates with Spotify to fetch user playlists.

## Recent Changes
- **November 19, 2024**: Created Kubernetes deployment infrastructure for Azure AKS
  - Built complete containerization with Dockerfile.backend and Dockerfile.frontend
  - Created all Kubernetes manifests (deployments, services, ingress, configmap, secrets)
  - Added comprehensive deployment guide (k8s/DEPLOY.md) for AKS setup
  - Fixed port alignment across all components (backend standardized to 8080)
  - Configured environment-based CORS and redirect URIs for multi-environment support
  - Implemented semantic versioning for Docker images (v1.0.0)
  - Backend supports both monolithic (Replit) and microservice (K8s) architectures
- **November 19, 2024**: Removed playlist search functionality
  - Simplified GameSetupScreen to only show user's own playlists
  - Removed search bar and search-related code
  - Cleaner, more focused playlist selection experience
- **November 18, 2024**: Premium users can now play all tracks with 15-second snippets
  - Changed preview duration to 15 seconds for all users
  - **Premium users**: Use Spotify Web Playback SDK to play first 15 seconds of ANY track
  - **Free users**: Use preview URLs (only tracks with preview URLs available)
  - Added "Open in Spotify" button to open full track in Spotify web player
  - Premium playback uses event-driven state tracking for accurate position monitoring
  - Fixed device activation with retry logic to prevent 404 errors
  - Fixed server.js port configuration: backend uses 8082, Expo uses 8081
- **November 17, 2024**: Initial app creation with Spotify OAuth integration
  - Implemented complete game flow with authentication, playlist selection, gameplay, and results
  - Configured for web browser sharing with friends
  - Set up configurable preview duration in `constants/config.ts`
  - Updated deployment to serve web version at root URL (not just QR code landing page)
  - Modified build.js to export both web version and native manifests
  - **Added Express backend proxy server** (server.js) to handle Spotify OAuth token exchange
    - Runs on port 8082 (external port 3000)
    - Provides /api/spotify/token endpoint to exchange authorization codes for tokens
    - Provides /api/spotify/refresh endpoint to refresh expired tokens
    - Bypasses CORS restrictions for client-side OAuth
    - Updated auth.ts to call backend proxy at `https://<hostname>:3000/api/spotify/token`

## User Preferences
- None specified yet

## Project Architecture

### Tech Stack
- **Frontend**: Expo SDK 54, React Native, TypeScript
- **Navigation**: React Navigation 7
- **Animations**: react-native-reanimated
- **Styling**: Spotify-themed design (Spotify Green #1DB954)
- **Integration**: Spotify Web API via Replit Connector

### Key Features
1. **Spotify OAuth Authentication**: Uses Replit Spotify connector for seamless auth
2. **Playlist Management**: 
   - View user's Spotify playlists
   - Mock data fallback for testing
3. **Game Mechanics**:
   - 10 rounds per game
   - 4 multiple-choice answers per question
   - 15-second audio preview for all users
   - "Open in Spotify" button to play full track
   - Real-time score tracking
   - Detailed results breakdown
4. **Cross-Platform**: Works on iOS, Android, and Web

### File Structure
```
├── screens/
│   ├── LoginScreen.tsx          # Spotify OAuth login
│   ├── MenuScreen.tsx            # Main menu with stats
│   ├── GameSetupScreen.tsx       # Playlist selection & search
│   ├── GamePlayScreen.tsx        # Main trivia gameplay
│   ├── ResultsScreen.tsx         # Game results breakdown
│   └── SettingsScreen.tsx        # User settings & stats
├── navigation/
│   ├── MainStackNavigator.tsx    # Main navigation stack
│   └── screenOptions.ts          # Shared screen options
├── components/
│   ├── Button.tsx                # Animated button component
│   ├── Card.tsx                  # Reusable card component
│   ├── ScreenScrollView.tsx      # Safe area scroll view
│   └── ErrorBoundary.tsx         # App crash handler
├── utils/
│   ├── auth.ts                   # OAuth flow with backend proxy
│   └── spotify.ts                # Spotify API integration
├── constants/
│   ├── config.ts                 # Game configuration
│   └── theme.ts                  # Design tokens
├── server.js                     # Express backend for OAuth proxy
└── App.tsx                       # Root component
```

### Configuration

#### Preview Duration
Adjust in `constants/config.ts`:
```typescript
export const PREVIEW_DURATION_MS = 15000; // 15 seconds
export const QUESTION_COUNT = 10;
export const ANSWER_OPTIONS_COUNT = 4;
```

#### Bundle Identifiers
- iOS: `com.guessthattrack.app`
- Android: `com.guessthattrack.app`
- URL Scheme: `guessthattrack://`

### Spotify Integration
The app uses the Replit Spotify connector with the following permissions:
- `playlist-read-private`, `playlist-read-collaborative`
- `user-read-email`, `user-read-private`
- `user-read-recently-played`, `user-top-read`
- `streaming`, `user-read-playback-state`

#### OAuth Backend Proxy
To bypass CORS restrictions, the app uses an Express backend proxy:
- **Development**: Backend runs on port 8082 (external port 3000)
- **Production**: Backend serves static files and handles OAuth on port 8081
- Frontend calls `https://<hostname>:3000/api/spotify/token` in development
- Backend exchanges authorization codes for access/refresh tokens using PKCE
- Spotify redirect URIs configured:
  - Dev: `https://0e0cc435-9544-4e60-913d-c4cfb4d104ae-00-1lauom5e6qo4b.riker.replit.dev/callback`
  - Prod: `https://spotify-trivia-jclaeson.replit.app/callback`

### Web Deployment
The app is fully playable in web browsers at the published URL. When you publish the app:
- The web version is served at the root URL (e.g., https://yourapp.replit.app)
- Native Expo Go manifests are available at /ios and /android for mobile scanning
- The build process (scripts/build.js) automatically:
  1. Exports the web version using `expo export -p web`
  2. Builds native bundles for iOS and Android
  3. Copies all files to the static-build directory for deployment

On web, the app fetches real Spotify data via OAuth. On mobile (Expo Go), it uses mock data for testing.

### Development Notes
- Hot Module Reloading (HMR) is enabled for rapid development
- Use QR code from Replit URL bar to test on physical devices via Expo Go
- Web version accessible at the provided localhost URL during development
- **Backend server must be running** for OAuth to work:
  - Start manually: `PORT=8080 node server.js` (defaults to 8080 now)
  - Or use `bash start-dev.sh` to start both Expo and backend servers
- Expo runs on port 8081, backend defaults to port 8080 (configurable via PORT env var)

### Kubernetes Deployment
The app is fully containerized and ready for deployment on Azure Kubernetes Service (AKS):

**Architecture:**
- **Backend Container** (Node.js Alpine): Express OAuth server handling /api routes and /callback
- **Frontend Container** (Multi-stage: Expo build + Nginx): Serves static web bundle

**Deployment Files:**
- `Dockerfile.backend` - Backend containerization with health checks
- `Dockerfile.frontend` - Multi-stage build (Expo + Nginx serving)
- `k8s/backend-deployment.yaml` - Backend pod configuration with secrets and configmap
- `k8s/frontend-deployment.yaml` - Frontend pod configuration
- `k8s/backend-service.yaml` - Backend ClusterIP service (port 8080)
- `k8s/frontend-service.yaml` - Frontend ClusterIP service (port 80)
- `k8s/ingress.yaml` - Nginx ingress with path-based routing
- `k8s/configmap.yaml` - Environment variables (ALLOWED_ORIGINS, ALLOWED_REDIRECT_URIS, etc.)
- `k8s/secrets.yaml.template` - Secret template for Spotify credentials
- `k8s/DEPLOY.md` - Complete deployment guide with Azure CLI commands

**Key Features:**
- Environment-based configuration (CORS origins, redirect URIs)
- Semantic versioning for images (v1.0.0)
- Health checks and readiness probes
- Resource limits and requests
- Ingress routing: `/api` and `/callback` → backend, `/` → frontend
- Cross-platform deployment scripts (macOS and Linux compatible)

### Known Limitations
- Audio preview playback is simulated (no actual Spotify audio in prototype)
- Mock track data used for question generation
- Real Spotify integration fully ready but using mock data in MVP for faster testing
