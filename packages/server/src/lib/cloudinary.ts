/**
 * Cloudinary wrapper. The SDK reads CLOUDINARY_URL from the environment on
 * import, so we just confirm it's set and expose a single typed helper.
 *
 * Per spec §5.2 (Media: Cloudinary) and release plan §4.1 (env-variable
 * matrix). Free-tier limits: 25 monthly credits, 25 GB managed storage.
 */
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../config/env.js';

if (!env.CLOUDINARY_URL) {
  console.warn(
    '[cloudinary] CLOUDINARY_URL is not set — image uploads will fail. ' +
      'Get one at https://cloudinary.com (free tier).',
  );
}

cloudinary.config({ secure: true });

export interface UploadOptions {
  /** Cloudinary folder (e.g., "stageone-dev/artists/avatars"). */
  folder: string;
  /** Override the auto-generated public_id; useful so re-uploads replace. */
  publicId?: string;
  /** Predefined Cloudinary transformations applied at upload time. */
  transformation?: Record<string, unknown>[];
}

/**
 * Uploads an in-memory buffer to Cloudinary using upload_stream — no temp
 * files on disk. Returns the response so callers can read `secure_url`,
 * `public_id`, dimensions, etc.
 */
export function uploadBuffer(
  buffer: Buffer,
  options: UploadOptions,
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: 'image',
        overwrite: true,
        transformation: options.transformation,
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary returned no result'));
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

/** Delete an asset by public_id. Used when an artist replaces a previous upload. */
export async function destroyAsset(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export { cloudinary };
