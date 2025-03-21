import { supabase } from "../lib/supabaseClient";

/**
 * Upload an ad creative to the "ad-creatives" bucket, returning a public URL.
 *
 * @param {File} file - the file from <input type="file" />
 * @param {string} pubId - publisher's ID
 * @param {string} frameKey - unique key identifying the ad frame
 * @returns {Promise<string>} - the public URL of the uploaded ad creative
 */
export async function uploadAdCreative(file, pubId, frameKey) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const bucketName = "ad-creatives";
  const filePath = `${pubId}/${frameKey}/${Date.now()}_${file.name}`;

  // 1) Upload the file to Supabase Storage
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);

  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  // 2) Generate a public URL for the uploaded file
  const publicUrl = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/${bucketName}/${filePath}`;
  return publicUrl;
}
