/**
 * PlayerContext — global audio-playback state.
 *
 * Owns a single hidden HTMLAudioElement so track playback survives route
 * navigation. Any component (track row on artist page, home-page "new this
 * week" strip, future search results) can call play(track) and the persistent
 * AudioPlayer bar at the bottom of the layout picks up the state.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiPost } from '../lib/api';

/**
 * Seconds of continuous playback required before we count a play, mirroring
 * Spotify's "counted play" threshold. Tracks shorter than this get their
 * play counted on the `ended` event instead so we don't undercount.
 */
const PLAY_COUNT_THRESHOLD_SECONDS = 30;

function reportPlay(track: PlayableTrack) {
  // Fire-and-forget. If the network hiccups, one uncounted play is fine —
  // we don't want to block the player UI or log noise.
  void apiPost(`/api/artists/${track.artistSlug}/tracks/${track._id}/play`).catch(() => {});
}

export interface PlayableTrack {
  _id: string;
  title: string;
  album: string | null;
  durationSeconds: number;
  audioUrl: string;
  artistName: string;
  artistSlug: string;
}

export interface PlayerContextValue {
  currentTrack: PlayableTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  play(track: PlayableTrack): void;
  togglePlay(): void;
  seek(seconds: number): void;
  stop(): void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayableTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // The mount-time event handlers close over their initial state. To read
  // the *current* track from inside those handlers we mirror it into a ref.
  const currentTrackRef = useRef<PlayableTrack | null>(null);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Tracks that have already had a play counted this session. Prevents
  // spam-counting by scrubbing back to 0 repeatedly on the same track.
  const reportedRef = useRef<Set<string>>(new Set());

  // Create the audio element on mount, tear down on unmount.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Play-count threshold. We check inside timeupdate (fires ~4x/s in
      // most browsers) so we don't need a separate timer.
      const track = currentTrackRef.current;
      if (
        track &&
        audio.currentTime >= PLAY_COUNT_THRESHOLD_SECONDS &&
        !reportedRef.current.has(track._id)
      ) {
        reportedRef.current.add(track._id);
        reportPlay(track);
      }
    };
    const onDurationChange = () => {
      // Fall back to the DB duration if the file's metadata is unavailable
      // (e.g., some CDNs strip it) — set later via the play() callback.
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      // Tracks shorter than the threshold should still count as a play if
      // the user listened all the way through.
      const track = currentTrackRef.current;
      if (track && !reportedRef.current.has(track._id)) {
        reportedRef.current.add(track._id);
        reportPlay(track);
      }
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setError('Could not play this track. The audio file may be unavailable.');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const play = useCallback(
    (track: PlayableTrack) => {
      const audio = audioRef.current;
      if (!audio) return;
      setError(null);

      // If the same track is clicked again, toggle instead of restart.
      if (currentTrack?._id === track._id) {
        if (audio.paused) void audio.play().catch(() => {});
        else audio.pause();
        return;
      }

      setCurrentTrack(track);
      setDuration(track.durationSeconds); // optimistic; refined by durationchange
      setCurrentTime(0);
      audio.src = track.audioUrl;
      audio.load();
      void audio.play().catch(() => {
        // Browser autoplay policies can reject play() without user gesture.
        // We only ever call play() from a click handler so this is rare, but
        // catch defensively so promise rejection doesn't leak to the console.
      });
    },
    [currentTrack],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  }, [currentTrack]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = '';
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      error,
      play,
      togglePlay,
      seek,
      stop,
    }),
    [currentTrack, isPlaying, currentTime, duration, error, play, togglePlay, seek, stop],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside a <PlayerProvider>');
  return ctx;
}
