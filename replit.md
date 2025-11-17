# Guess That Track - Spotify Trivia Game

## Overview
An interactive music trivia game built with Expo React Native that challenges users to identify songs from short audio previews. The app integrates with Spotify to fetch user playlists and allows searching for themed playlists.

## Recent Changes
- **November 17, 2024**: Initial app creation with Spotify OAuth integration
  - Implemented complete game flow with authentication, playlist selection, gameplay, and results
  - Added playlist search functionality allowing users to search by theme/keywords
  - Configured for web browser sharing with friends
  - Set up configurable preview duration in `constants/config.ts`
  - Updated deployment to serve web version at root URL (not just QR code landing page)
  - Modified build.js to export both web version and native manifests

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
   - Search for playlists by theme/keywords
   - Mock data fallback for testing
3. **Game Mechanics**:
   - 10 rounds per game
   - 4 multiple-choice answers per question
   - Configurable audio preview duration (default 5 seconds)
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
│   └── spotify.ts                # Spotify API integration
├── constants/
│   ├── config.ts                 # Game configuration
│   └── theme.ts                  # Design tokens
└── App.tsx                       # Root component
```

### Configuration

#### Preview Duration
Adjust in `constants/config.ts`:
```typescript
export const PREVIEW_DURATION_MS = 5000; // milliseconds
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

### Known Limitations
- Audio preview playback is simulated (no actual Spotify audio in prototype)
- Mock track data used for question generation
- Real Spotify integration fully ready but using mock data in MVP for faster testing
