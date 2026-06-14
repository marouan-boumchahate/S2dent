import db from '../config/db.js';
import { deleteImages } from '../utils/cloudinary.js';
import { IMAGES_CLEANUP_INTERVAL_MS } from '../config/ttl.js';


// Helpers
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  
  return chunks;
};
const fetchInactiveMedia = async () => {
  const { rows } = await db.query(`
    SELECT id, public_id, url 
    FROM media
    WHERE is_active = FALSE
      AND created_at < NOW() - INTERVAL '24 hours'
  `);

  return rows;
};
const deleteChunkFromCloudinary = async (publicIds) => {
  try {
    console.log(`=> Deleting batch of ${publicIds.length} images from Cloudinary.`);
    await deleteImages(publicIds);
  } catch (err) {
    console.error(`=> Failed to delete batch of images from Cloudinary:`, err.message);
  }
}
const deleteMediaFromDatabase = async (ids) => {
  try {
    await db.query(
      'DELETE FROM media WHERE id = ANY($1)',
      [ids]
    );
  } catch (err) {
    console.error(`=> Failed to delete media records from database:`, err.message);
  }
};


// Main Cleanup Function
const cleanupInactiveMedia = async () => {
  try {
    const { rows: inactiveMedia } = await fetchInactiveMedia();

    if (inactiveMedia.length === 0) {
      console.log('=> No inactive media items found.');
      return;
    }

    console.log(`=> Found ${inactiveMedia.length} inactive media items to clean up.`);

    const publicIds = inactiveMedia.map(item => item.public_id);
    const ids = inactiveMedia.map(item => item.id);

    const batches = chunkArray(publicIds, 100); // Cloudinary allows batch deletion of maximum 100 resources

    for (const batch of batches) await deleteChunkFromCloudinary(batch);

    await deleteMediaFromDatabase(ids);

    console.log(`=> Cleaned up ${inactiveMedia.length} inactive media records.`);
  } catch (err) {
    console.error('=> Error running media cleanup job:', err);
  }
};


// Job Initializer
export const startMediaCleanupJob = () => {
  console.log('=> Media Cleanup Job initialized.');

  cleanupInactiveMedia();
  setInterval(cleanupInactiveMedia, IMAGES_CLEANUP_INTERVAL_MS);
};
