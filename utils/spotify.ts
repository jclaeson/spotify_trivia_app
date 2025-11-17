import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);
   const refreshToken =
    connectionSettings?.settings?.oauth?.credentials?.refresh_token;
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
const clientId = connectionSettings?.settings?.oauth?.credentials?.client_id;
  const expiresIn = connectionSettings.settings?.oauth?.credentials?.expires_in;
  if (!connectionSettings || (!accessToken || !clientId || !refreshToken)) {
    throw new Error('Spotify not connected');
  }
  return {accessToken, clientId, refreshToken, expiresIn};
}

export async function getUncachableSpotifyClient() {
  const {accessToken, clientId, refreshToken, expiresIn} = await getAccessToken();

  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  });

  return spotify;
}

export async function getUserPlaylists() {
  try {
    const spotify = await getUncachableSpotifyClient();
    const playlists = await spotify.currentUser.playlists.playlists(50);
    return playlists.items.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      trackCount: playlist.tracks?.total || 0,
      imageUrl: playlist.images?.[0]?.url,
    }));
  } catch (error) {
    console.error('Error fetching user playlists:', error);
    return [];
  }
}

export async function searchPlaylists(query: string) {
  try {
    const spotify = await getUncachableSpotifyClient();
    const results = await spotify.search(query, ['playlist'], undefined, 20);
    return results.playlists.items.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      trackCount: playlist.tracks?.total || 0,
      imageUrl: playlist.images?.[0]?.url,
      owner: playlist.owner?.display_name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error searching playlists:', error);
    return [];
  }
}

export async function getUserTopTracks() {
  try {
    const spotify = await getUncachableSpotifyClient();
    const topTracks = await spotify.currentUser.topItems('tracks', 'medium_term', 50);
    return topTracks.items;
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return [];
  }
}

export async function getPlaylistTracks(playlistId: string) {
  try {
    const spotify = await getUncachableSpotifyClient();
    const playlist = await spotify.playlists.getPlaylist(playlistId);
    if (!playlist.tracks) {
      return [];
    }
    return playlist.tracks.items
      .filter(item => item.track)
      .map(item => ({
        id: item.track!.id,
        name: item.track!.name,
        artist: item.track!.artists[0]?.name || 'Unknown Artist',
        previewUrl: item.track!.preview_url,
      }));
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return [];
  }
}
