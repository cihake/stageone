/**
 * AudioPlayer — persistent bottom-bar player. Renders nothing when no track
 * is loaded; slides into view when the user starts playback anywhere in the
 * app. Modeled on Bandcamp / Spotify's persistent-bar pattern (spec §7.1
 * lists Bandcamp as a design reference).
 */
import { type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import './audio-player.css';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AudioPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, error, togglePlay, seek, stop } =
    usePlayer();

  if (!currentTrack) return null;

  const effectiveDuration = duration || currentTrack.durationSeconds;

  function onSeek(event: ChangeEvent<HTMLInputElement>) {
    seek(Number(event.target.value));
  }

  return (
    <div className="audio-player" role="region" aria-label="Audio player">
      <div className="audio-player__inner container">
        <div className="audio-player__track">
          <p className="audio-player__title">{currentTrack.title}</p>
          <p className="audio-player__artist">
            <Link to={`/artists/${currentTrack.artistSlug}`}>{currentTrack.artistName}</Link>
            {currentTrack.album && (
              <>
                {' · '}
                <span>{currentTrack.album}</span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          className="audio-player__playpause"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>

        <div className="audio-player__scrubber">
          <span className="audio-player__time">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={effectiveDuration || 0}
            step={1}
            value={Math.min(currentTime, effectiveDuration || 0)}
            onChange={onSeek}
            className="audio-player__range"
            aria-label="Seek"
          />
          <span className="audio-player__time">{formatTime(effectiveDuration)}</span>
        </div>

        <button
          type="button"
          className="audio-player__close"
          onClick={stop}
          aria-label="Close player"
          title="Close player"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="audio-player__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
