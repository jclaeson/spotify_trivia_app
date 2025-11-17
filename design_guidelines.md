# Spotify Trivia Game - Design Guidelines

## Architecture Decisions

### Authentication
**Auth Required** - Uses Spotify OAuth
- Implement Spotify OAuth 2.0 with PKCE flow
- Login screen displays:
  - App logo/title
  - "Login with Spotify" button (Spotify green #1DB954)
  - Brief description of the game
- Mock OAuth flow during prototype development
- Profile screen includes:
  - Spotify profile picture and display name
  - Stats (games played, best score, accuracy rate)
  - Settings (preview duration slider, sound effects toggle)
  - Log out button

### Navigation
**Stack-Only with Modal Overlay**
- Linear game flow with modals for results
- Main Stack:
  1. Login Screen (if not authenticated)
  2. Home/Menu Screen
  3. Game Setup Screen (select playlist/use top tracks)
  4. Game Play Screen (main game loop)
  5. Results Screen (end of game summary)
- Modal overlays for answer feedback (correct/incorrect)

## Screen Specifications

### 1. Login Screen
- **Purpose**: Authenticate user with Spotify
- **Layout**:
  - No header
  - Centered content with gradient background (#1DB954 to #191414)
  - Top inset: insets.top + Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Components**:
  - App title/logo (centered)
  - Tagline: "Guess That Track!"
  - Large "Login with Spotify" button (rounded, elevated)
  - Drop shadow for button: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2

### 2. Home/Menu Screen
- **Purpose**: Navigate to game modes and view profile
- **Layout**:
  - Transparent header with profile icon (right)
  - Non-scrollable content
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Components**:
  - "Play Now" primary button (large, Spotify green)
  - Quick stats card (games played, best score)
  - Settings button (gear icon, bottom)

### 3. Game Setup Screen
- **Purpose**: Select playlist source for questions
- **Layout**:
  - Default navigation header with back button (left)
  - Scrollable list
  - Top inset: Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Components**:
  - Option cards:
    - "My Top Tracks" (recommended badge)
    - "Recently Played"
    - List of user's playlists
  - Each card shows icon + title + track count

### 4. Game Play Screen
- **Purpose**: Main trivia gameplay
- **Layout**:
  - Custom header with round counter (left) and score (right)
  - Transparent header
  - Non-scrollable content with fixed zones
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Components**:
  - Progress bar (shows round X of Y)
  - Album artwork area (placeholder or actual art)
  - Audio playback control:
    - Play/Pause button (large, centered, floating)
    - Waveform visualization or progress indicator
    - Duration counter (e.g., "0:03 / 0:05")
  - Four answer buttons (2x2 grid or vertical list):
    - Track title + artist name
    - Equal size, rounded corners
    - Clear active/pressed states
- **Floating Elements**:
  - Play button shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2

### 5. Answer Feedback Modal
- **Purpose**: Show immediate result after answer selection
- **Layout**:
  - Native modal (centered overlay)
  - Dim background (0.7 opacity black)
- **Components**:
  - Result icon (checkmark for correct, X for incorrect)
  - "Correct!" or "Wrong!" text (large, bold)
  - Correct answer display (if wrong)
  - "Next Round" button

### 6. Results Screen
- **Purpose**: Display game summary and stats
- **Layout**:
  - Default navigation header with "Done" button (right)
  - Scrollable content
  - Top inset: Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Components**:
  - Final score (large, prominent)
  - Accuracy percentage
  - Round-by-round breakdown (scrollable list)
  - "Play Again" button (primary)
  - "Change Playlist" button (secondary)

### 7. Profile/Settings Screen
- **Purpose**: User preferences and stats
- **Layout**:
  - Default navigation header with "Settings" title
  - Scrollable form
  - Top inset: Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Components**:
  - Spotify profile section (avatar, name, linked status)
  - Slider for preview duration (2-10 seconds, configurable constant)
  - Toggle for sound effects
  - Stats section (total games, best score, accuracy)
  - Log out button (bottom, red text)

## Design System

### Color Palette
- **Primary**: Spotify Green (#1DB954)
- **Background**: Dark (#191414, #121212)
- **Surface**: Dark Gray (#282828)
- **Text Primary**: White (#FFFFFF)
- **Text Secondary**: Light Gray (#B3B3B3)
- **Success**: Green (#1DB954)
- **Error**: Red (#E22134)

### Typography
- **Headings**: System bold, 24-32pt
- **Body**: System regular, 16pt
- **Labels**: System medium, 14pt
- **Captions**: System regular, 12pt

### Visual Design
- Use Feather icons from @expo/vector-icons
- All buttons have visual feedback (scale 0.95 or opacity 0.7 on press)
- Answer buttons:
  - Default: dark gray surface (#282828)
  - Correct: green border + light green tint
  - Incorrect: red border + light red tint
  - Selected: white border
- Cards use subtle rounded corners (12-16px radius)
- Only floating action button (play/pause) uses drop shadow
- Album artwork: rounded corners, aspect ratio 1:1

### Assets Needed
- App icon/logo with music/trivia theme
- Default album placeholder (gradient or musical note icon)
- Result feedback icons (checkmark, X symbol)

### Accessibility
- Minimum touch target: 44x44pt
- Color contrast ratio 4.5:1 for text
- Audio feedback for correct/incorrect answers
- Support for system font scaling
- VoiceOver labels for all interactive elements