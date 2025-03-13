import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async (req, res) => {
  // Extract the listingId from the URL path (e.g., /serve-ad/[listingId])
  const listingId = req.query.listingId || req.url.split('/').pop().split('?')[0];
  const frame = req.query.frame;

  if (!listingId || !frame) {
    res.status(400).send('Missing listingId or frame parameter');
    return;
  }

  // Fetch the listing from Supabase
  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (error || !listing) {
    res.status(404).send('Listing not found');
    return;
  }

  // For now, return a simple HTML response with a placeholder ad
  // In a real app, you’d fetch an actual ad (e.g., an image URL) based on the listing
  res.status(200).setHeader('Content-Type', 'text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ad</title>
    </head>
    <body>
      <div style="width: 100%; height: 100%; background-color: #f0f0f0; display: flex; justify-content: center; align-items: center;">
        <h2>Ad Placeholder for Listing ${listingId} (${frame})</h2>
      </div>
    </body>
    </html>
  `);
};