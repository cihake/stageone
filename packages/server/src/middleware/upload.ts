/**
 * Multer middleware factories for image uploads. In-memory storage so the
 * file lives only in RAM until we forward it to Cloudinary, then it's GC'd.
 *
 * File-size limits per spec §6.3 (media performance) and the needs
 * assessment ("audio ≤ 20 MB, video ≤ 100 MB" — image limits set here).
 */
import multer, { type Options } from 'multer';
import { HttpError } from './error.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function imageFileFilter(): NonNullable<Options['fileFilter']> {
  return (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new HttpError(400, `Unsupported image type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  };
}

/** Multer for avatar uploads — max 5 MB. */
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter(),
});

/** Multer for cover-image uploads — max 10 MB (larger because hero-sized). */
export const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter(),
});
