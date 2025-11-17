import { Platform } from "react-native";

export async function checkSpotifyAuth(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    return true;
  }

  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      return false;
    }

    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    const data = await response.json();
    return data.items && data.items.length > 0;
  } catch (error) {
    console.error('Error checking Spotify auth:', error);
    return false;
  }
}

export function initiateSpotifyLogin(): void {
  if (Platform.OS === 'web') {
    window.location.href = '/api/spotify/login';
  }
}
