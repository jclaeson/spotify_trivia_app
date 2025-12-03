import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { Platform } from "react-native";
import { getSpotifyAccessToken } from "./auth";

const SPOTIFY_CLIENT_ID = '04246e81b0fa44278bfd1821ad90204a';

async function getAccessToken() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const accessToken = getSpotifyAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated with Spotify');
    }
    return accessToken;
  }
  
  throw new Error('Spotify authentication only available on web');
}

export async function getUncachableSpotifyClient() {
  const accessToken = await getAccessToken();

  const spotify = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "",
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
        albumImageUrl: item.track!.album?.images?.[0]?.url,
      }));
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return [];
  }
}
