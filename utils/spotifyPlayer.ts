import { Platform } from "react-native";
import { getSpotifyAccessToken } from "./auth";
import { getUncachableSpotifyClient } from "./spotify";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback?: (...args: any[]) => void) => void;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  _options: {
    getOAuthToken: (cb: (token: string) => void) => void;
  };
}

interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      name: string;
      artists: Array<{ name: string }>;
    };
  };
}

let player: SpotifyPlayer | null = null;
let deviceId: string | null = null;
let sdkLoaded = false;

export async function loadSpotifySDK(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('Spotify Web Playback SDK is only available on web');
  }

  if (sdkLoaded) {
    return;
  }

  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      sdkLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;

    window.onSpotifyWebPlaybackSDKReady = () => {
      sdkLoaded = true;
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Spotify SDK'));
    };

    document.body.appendChild(script);
  });
}

export async function initializePlayer(): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  if (player && deviceId) {
    return deviceId;
  }

  try {
    await loadSpotifySDK();

    if (!window.Spotify) {
      throw new Error('Spotify SDK not loaded');
    }

    const token = getSpotifyAccessToken();
    if (!token) {
      throw new Error('No Spotify access token');
    }

    player = new window.Spotify.Player({
      name: 'Guess That Track Player',
      getOAuthToken: (cb) => {
        const currentToken = getSpotifyAccessToken();
        if (currentToken) {
          cb(currentToken);
        }
      },
      volume: 0.5,
    });

    return new Promise((resolve, reject) => {
      if (!player) {
        reject(new Error('Player not initialized'));
        return;
      }

      player.addListener('ready', async ({ device_id }: { device_id: string }) => {
        console.log('Spotify Player ready with device ID:', device_id);
        deviceId = device_id;
        
        try {
          const token = getSpotifyAccessToken();
          if (token) {
            const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                device_ids: [device_id],
                play: false,
              }),
            });

            if (!transferResponse.ok && transferResponse.status !== 204) {
              console.warn('Device activation warning:', transferResponse.status);
            } else {
              console.log('Device activated successfully');
            }
          }
        } catch (error) {
          console.warn('Error activating device:', error);
        }
        
        resolve(device_id);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Player not ready:', device_id);
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Spotify Player initialization error:', message);
        reject(new Error(message));
      });

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Spotify Player authentication error:', message);
        reject(new Error(message));
      });

      player.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Spotify Player account error:', message);
        reject(new Error(message));
      });

      player.connect().catch(reject);
    });
  } catch (error) {
    console.error('Error initializing Spotify player:', error);
    return null;
  }
}

export async function playTrack(trackUri: string, positionMs: number = 0): Promise<boolean> {
  try {
    if (!deviceId) {
      const id = await initializePlayer();
      if (!id) {
        return false;
      }
    }

    const token = getSpotifyAccessToken();
    if (!token) {
      return false;
    }

    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        uris: [trackUri],
        position_ms: positionMs,
      }),
    });

    if (!response.ok && response.status !== 204) {
      console.error('Playback error:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error playing track:', error);
    return false;
  }
}

export async function pausePlayback(): Promise<boolean> {
  try {
    if (!player) {
      return false;
    }

    await player.pause();
    return true;
  } catch (error) {
    console.error('Error pausing playback:', error);
    return false;
  }
}

export async function resumePlayback(): Promise<boolean> {
  try {
    if (!player) {
      return false;
    }

    await player.resume();
    return true;
  } catch (error) {
    console.error('Error resuming playback:', error);
    return false;
  }
}

export async function seekTo(positionMs: number): Promise<boolean> {
  try {
    if (!player) {
      return false;
    }

    await player.seek(positionMs);
    return true;
  } catch (error) {
    console.error('Error seeking:', error);
    return false;
  }
}

export async function getCurrentPlaybackState(): Promise<SpotifyPlayerState | null> {
  try {
    if (!player) {
      return null;
    }

    return await player.getCurrentState();
  } catch (error) {
    console.error('Error getting playback state:', error);
    return null;
  }
}

export function addPlayerListener(event: string, callback: (...args: any[]) => void): void {
  if (player) {
    player.addListener(event, callback);
  }
}

export function removePlayerListener(event: string, callback?: (...args: any[]) => void): void {
  if (player) {
    player.removeListener(event, callback);
  }
}

export function disconnectPlayer(): void {
  if (player) {
    player.disconnect();
    player = null;
    deviceId = null;
  }
}

export function getDeviceId(): string | null {
  return deviceId;
}

export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const spotify = await getUncachableSpotifyClient();
    const user = await spotify.currentUser.profile();
    return user.product === 'premium';
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}
