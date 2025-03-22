import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pczzwgluhgrjuxjadyaq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0');

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { listingId, frameId } = req.query;
  if (!listingId || !frameId) {
    return res.status(400).json({ error: 'Missing listingId or frameId' });
  }
  const { data, error } = await supabase
    .from('frames')
    .select('uploaded_file')
    .eq('listing_id', listingId)
    .eq('frame_id', frameId)
    .single();
  if (error || !data) {
    return res.status(404).json({ error: 'Ad not found' });
  }
  const imageUrl = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${data.uploaded_file}`;
  res.status(200).json({ imageUrl });
};