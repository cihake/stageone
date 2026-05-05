/**
 * GenreTagsInput — chip-style multi-tag entry. Press Enter or comma to
 * commit a tag, click × on an existing tag to remove it. Caps at maxTags.
 */
import { useState, type KeyboardEvent } from 'react';

interface Props {
  value: string[];
  onChange(next: string[]): void;
  maxTags?: number;
  placeholder?: string;
  id?: string;
}

export function GenreTagsInput({
  value,
  onChange,
  maxTags = 10,
  placeholder = 'indie, folk, …',
  id,
}: Props) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (value.includes(tag)) return;
    if (value.length >= maxTags) return;
    onChange([...value, tag]);
    setDraft('');
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      // Quality-of-life: backspace on empty input pops the last tag.
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="genre-tags">
      <div className="genre-tags__chips">
        {value.map((tag) => (
          <span key={tag} className="genre-tags__chip">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Remove ${tag}`}
              className="genre-tags__remove"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={value.length >= maxTags}
          className="genre-tags__input"
        />
      </div>
      <span className="help">
        {value.length}/{maxTags} tags · Enter or comma to add
      </span>
    </div>
  );
}
