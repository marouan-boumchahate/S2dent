import db from '../../config/db.js';
import { uploadImage } from '../../utils/cloudinary.js';


// Helpers
const updateRecord = async (client, url, status) => {
  await client.query(
    `UPDATE media 
     SET is_active = $1, updated_at = NOW() 
     WHERE url = $2`,
    [status, url]
  );
};
const insertRecord = async (client, url, publicId) => {
  await client.query(
    `INSERT INTO media (url, public_id, is_active, created_at, updated_at)
     VALUES ($1, $2, FALSE, NOW(), NOW())`,
    [url, publicId]
  );
};


// Service Functions
export const handleMediaUpdate = async (oldUrl, newUrl, client = db) => {
  if (oldUrl === newUrl) return;

  if (newUrl) await updateRecord(client, newUrl, true);
  if (oldUrl) await updateRecord(client, oldUrl, false);
};
export const uploadMediaService = async (buffer, mimetype) => {
  const { url, publicId } = await uploadImage(buffer, mimetype);

  await insertRecord(db, url, publicId);

  return { url };
};

