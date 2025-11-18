import { Platform } from "react-native";
import { getPlaylistTracks, getUserTopTracks } from "./spotify";
import { ANSWER_OPTIONS_COUNT } from "@/constants/config";

export interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
}

export interface GameQuestion {
  correctTrack: Track;
  options: Track[];
  correctAnswerId: string;
}

const MOCK_TRACKS: Track[] = [
  { id: "1", name: "Blinding Lights", artist: "The Weeknd", previewUrl: "mock" },
  { id: "2", name: "Shape of You", artist: "Ed Sheeran", previewUrl: "mock" },
  { id: "3", name: "Dance Monkey", artist: "Tones and I", previewUrl: "mock" },
  { id: "4", name: "Someone Like You", artist: "Adele", previewUrl: "mock" },
  { id: "5", name: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", previewUrl: "mock" },
  { id: "6", name: "Bohemian Rhapsody", artist: "Queen", previewUrl: "mock" },
  { id: "7", name: "Hotel California", artist: "Eagles", previewUrl: "mock" },
  { id: "8", name: "Smells Like Teen Spirit", artist: "Nirvana", previewUrl: "mock" },
  { id: "9", name: "Billie Jean", artist: "Michael Jackson", previewUrl: "mock" },
  { id: "10", name: "Wonderwall", artist: "Oasis", previewUrl: "mock" },
  { id: "11", name: "Sweet Child O' Mine", artist: "Guns N' Roses", previewUrl: "mock" },
  { id: "12", name: "Rolling in the Deep", artist: "Adele", previewUrl: "mock" },
  { id: "13", name: "Thinking Out Loud", artist: "Ed Sheeran", previewUrl: "mock" },
  { id: "14", name: "Shallow", artist: "Lady Gaga & Bradley Cooper", previewUrl: "mock" },
  { id: "15", name: "Bad Guy", artist: "Billie Eilish", previewUrl: "mock" },
  { id: "16", name: "Levitating", artist: "Dua Lipa", previewUrl: "mock" },
  { id: "17", name: "drivers license", artist: "Olivia Rodrigo", previewUrl: "mock" },
  { id: "18", name: "Dynamite", artist: "BTS", previewUrl: "mock" },
  { id: "19", name: "Watermelon Sugar", artist: "Harry Styles", previewUrl: "mock" },
  { id: "20", name: "Peaches", artist: "Justin Bieber", previewUrl: "mock" },
];

export async function loadTracksForPlaylist(playlistId: string, hasPremium: boolean = false): Promise<Track[]> {
  try {
    if (Platform.OS === 'web') {
      let fetchedTracks: Track[] = [];
      
      if (playlistId === 'top-tracks') {
        const topTracks = await getUserTopTracks();
        fetchedTracks = topTracks.map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0]?.name || 'Unknown Artist',
          previewUrl: track.preview_url,
        }));
      } else {
        const playlistTracks = await getPlaylistTracks(playlistId);
        fetchedTracks = playlistTracks.map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artist,
          previewUrl: track.previewUrl,
        }));
      }

      if (hasPremium) {
        if (fetchedTracks.length >= ANSWER_OPTIONS_COUNT) {
          console.log(`Premium user: Using ${fetchedTracks.length} tracks (no preview URL required)`);
          return fetchedTracks;
        }
      } else {
        const tracksWithPreview = fetchedTracks.filter(track => track.previewUrl !== null);
        
        if (tracksWithPreview.length >= ANSWER_OPTIONS_COUNT) {
          console.log(`Free user: Using ${tracksWithPreview.length} tracks with preview URLs`);
          return tracksWithPreview;
        }
        
        console.warn(`Only ${tracksWithPreview.length} tracks with previews found, using mock data`);
      }
    }
  } catch (error) {
    console.error('Error loading tracks:', error);
  }

  return MOCK_TRACKS;
}

export function generateQuestion(tracks: Track[], excludeIds: string[] = []): GameQuestion | null {
  const availableTracks = tracks.filter(t => !excludeIds.includes(t.id));
  
  if (availableTracks.length < ANSWER_OPTIONS_COUNT) {
    return null;
  }

  const shuffled = [...availableTracks].sort(() => Math.random() - 0.5);
  const correctTrack = shuffled[0];
  const decoys = shuffled.slice(1, ANSWER_OPTIONS_COUNT);
  
  const options = [correctTrack, ...decoys].sort(() => Math.random() - 0.5);

  return {
    correctTrack,
    options,
    correctAnswerId: correctTrack.id,
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
