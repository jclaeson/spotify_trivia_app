import { Platform } from "react-native";

const SPOTIFY_CLIENT_ID = '04246e81b0fa44278bfd1821ad90204a';
const REDIRECT_URI = typeof window !== 'undefined' 
  ? `${window.location.origin}/callback` 
  : 'https://spotify-trivia-jclaeson.replit.app/callback';

const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-email',
  'user-read-private',
  'user-read-recently-played',
  'user-top-read',
].join(' ');

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function checkSpotifyAuth(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const accessToken = window.localStorage.getItem('spotify_access_token');
  const expiresAt = window.localStorage.getItem('spotify_token_expires_at');

  if (accessToken && expiresAt) {
    const now = Date.now();
    if (parseInt(expiresAt) > now) {
      return true;
    }
  }

  return false;
}

export async function initiateSpotifyLogin(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const codeVerifier = generateRandomString(64);
  window.localStorage.setItem('spotify_code_verifier', codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  const params = {
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}

export async function handleSpotifyCallback(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (!code) {
    return false;
  }

  const codeVerifier = window.localStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) {
    console.error('No code verifier found');
    return false;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    
    window.localStorage.setItem('spotify_access_token', data.access_token);
    window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
    const expiresAt = Date.now() + (data.expires_in * 1000);
    window.localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
    
    window.localStorage.removeItem('spotify_code_verifier');
    
    window.history.replaceState({}, document.title, '/');
    
    return true;
  } catch (error) {
    console.error('Error handling Spotify callback:', error);
    return false;
  }
}

export function getSpotifyAccessToken(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('spotify_access_token');
}

export function logout(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem('spotify_access_token');
  window.localStorage.removeItem('spotify_refresh_token');
  window.localStorage.removeItem('spotify_token_expires_at');
  window.localStorage.removeItem('spotify_code_verifier');
}
