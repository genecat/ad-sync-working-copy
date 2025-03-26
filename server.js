import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

// Serve-ad endpoint
app.get('/api/serve-ad/:listingId', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[Express] Handling OPTIONS request');
    return res.status(200).end();
  }

  const listingId = req.params.listingId;
  const frame = req.query.frame;
  const campaignId = req.query.campaignId;

  console.log('[Express] Request URL:', req.url);
  console.log('[Express] req.params:', req.params);
  console.log('[Express] req.query:', req.query);
  console.log('[Express] Listing ID:', listingId, 'Frame:', frame, 'Campaign ID:', campaignId);

  if (!frame) {
    console.log('[Express] Missing Frame Parameter:', { frame });
    res.status(400).send('Missing frame parameter');
    return;
  }

  console.log('[Express] Querying frames table with frame_id:', frame);
  const { data: frameData, error: frameError } = await supabase
    .from('frames')
    .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
    .eq('frame_id', frame);

  console.log('[Express] Frame Query Result:', { frameData, frameError });

  if (frameError) {
    console.error('[Express] Frame Query Error:', frameError);
    res.status(500).send('Error fetching frame data');
    return;
  }

  if (!frameData || frameData.length === 0) {
    console.log('[Express] No frame data found for frame:', frame);
    res.status(404).send('Frame not found');
    return;
  }

  const frameRecord = frameData[0];
  console.log('[Express] Frame Data:', frameRecord);

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, campaign_details')
    .eq('id', frameRecord.campaign_id)
    .single();

  console.log('[Express] Campaign Query Result:', { campaign, campaignError });

  if (campaignError) {
    console.error('[Express] Campaign Query Error:', campaignError);
    res.status(404).send('Campaign not found');
    return;
  }

  if (!campaign) {
    console.log('[Express] No campaign data found for campaign_id:', frameRecord.campaign_id);
    res.status(404).send('Campaign not found');
    return;
  }

  console.log('[Express] Campaign Data:', campaign);

  const endDate = new Date(
    campaign.campaign_details.endDate.year,
    campaign.campaign_details.endDate.month - 1,
    campaign.campaign_details.endDate.day
  );
  const today = new Date();
  console.log('[Express] End Date:', endDate, 'Today:', today);
  if (endDate < today) {
    console.log('[Express] Campaign has expired. End Date:', endDate, 'Today:', today);
    res.status(400).send('Campaign has expired');
    return;
  }

  let imageUrl;
  if (frameRecord.uploaded_file.startsWith('http')) {
    imageUrl = frameRecord.uploaded_file;
  } else {
    imageUrl = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${frameRecord.uploaded_file}`;
  }

  const targetUrl = campaign.campaign_details.targetURL || "https://mashdrop.com";

  console.log('[Express] Final Image URL:', imageUrl);
  console.log('[Express] Target URL:', targetUrl);

  // Track impression
  try {
    const response = await fetch('http://localhost:5173/api/track-impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frame, campaignId: campaignId || frameRecord.campaign_id })
    });
    console.log('[Express] Impression tracked:', await response.json());
  } catch (error) {
    console.error('[Express] Error tracking impression:', error.message);
  }

  res.status(200).setHeader('Content-Type', 'text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ad</title>
      <script>
        let isClicking = false;
        document.addEventListener('click', function(e) {
          if (e.target.tagName === 'IMG' && !isClicking) {
            isClicking = true;
            e.preventDefault();
            console.log('Click event triggered for ad');
            fetch('http://localhost:5173/api/track-click', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame: '${frame}', campaignId: '${campaignId || frameRecord.campaign_id}' })
            }).then(response => {
              console.log('Click tracked:', response);
              return response.json();
            }).then(data => {
              console.log('Click response:', data);
              window.open('${targetUrl}', '_blank');
              isClicking = false;
            }).catch(error => {
              console.error('Error tracking click:', error);
              window.open('${targetUrl}', '_blank');
              isClicking = false;
            });
          }
        });
      </script>
    </head>
    <body>
      <img src="${imageUrl}" style="border:none; max-width: 100%; max-height: 100%;" alt="Ad for Frame ${frame}" />
    </body>
    </html>
  `);
});

// Track-impression endpoint
app.post('/api/track-impression', async (req, res) => {
  console.log('[Express] Track Impression Request:', req.body);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frame, campaignId } = req.body;

  if (!frame || !campaignId) {
    return res.status(400).json({ error: 'Missing frame or campaignId' });
  }

  try {
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('impressions')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[Express] Error fetching campaign:', fetchError);
      return res.status(500).json({ error: 'Error fetching campaign' });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const newImpressions = (campaign.impressions || 0) + 1;

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ impressions: newImpressions })
      .eq('id', campaignId);

    if (updateError) {
      console.error('[Express] Error updating impressions:', updateError);
      return res.status(500).json({ error: 'Error updating impressions' });
    }

    return res.status(200).json({ success: true, impressions: newImpressions });
  } catch (error) {
    console.error('[Express] Error in track-impression:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Track-click endpoint
app.post('/api/track-click', async (req, res) => {
  console.log('[Express] Track Click Request:', req.body);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frame, campaignId } = req.body;

  if (!frame || !campaignId) {
    return res.status(400).json({ error: 'Missing frame or campaignId' });
  }

  try {
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('clicks')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[Express] Error fetching campaign:', fetchError);
      return res.status(500).json({ error: 'Error fetching campaign' });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const newClicks = (campaign.clicks || 0) + 1;

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ clicks: newClicks })
      .eq('id', campaignId);

    if (updateError) {
      console.error('[Express] Error updating clicks:', updateError);
      return res.status(500).json({ error: 'Error updating clicks' });
    }

    return res.status(200).json({ success: true, clicks: newClicks });
  } catch (error) {
    console.error('[Express] Error in track-click:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(5173, () => {
  console.log('Local API server running on http://localhost:5173');
});