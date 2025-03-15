import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const { listingId, frame } = req.body;

  if (!listingId || !frame) {
    res.status(400).send('Missing listingId or frame');
    return;
  }

  const { error } = await supabase.rpc('increment_click', {
    p_listing_id: listingId,
    p_frame: frame
  });

  if (error) {
    console.error("Click Tracking Error:", error);
    res.status(500).send('Error tracking click');
    return;
  }

  res.status(200).send('Click tracked successfully');
};