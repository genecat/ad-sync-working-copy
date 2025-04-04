import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.removeHeader('X-Frame-Options'); // Remove the X-Frame-Options header

  if (req.method === 'OPTIONS') {
    console.log('[serve-ad] Handling OPTIONS request');
    return res.status(200).end();
  }

  const listingId = req.params?.listingId || req.query?.listingId;
  const frame = req.query?.frame || req.query?.['frame[]'];
  const campaignId = req.query?.campaignId;

  console.log('[serve-ad] Request URL:', req.url);
  console.log('[serve-ad] req.params:', req.params);
  console.log('[serve-ad] req.query:', req.query);
  console.log('[serve-ad] Listing ID:', listingId, 'Frame:', frame, 'Campaign ID:', campaignId);

  if (!frame) {
    console.log('[serve-ad] Missing Frame Parameter:', { frame });
    res.status(400).send('Missing frame parameter');
    return;
  }

  console.log('[serve-ad] Querying frames table with frame_id:', frame);
  const { data: frameData, error: frameError } = await supabase
    .from('frames')
    .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
    .eq('frame_id', frame);

  console.log('[serve-ad] Frame Query Result:', { frameData, frameError });

  if (frameError) {
    console.error('[serve-ad] Frame Query Error:', frameError);
    res.status(500).send('Error fetching frame data');
    return;
  }

  if (!frameData || frameData.length === 0) {
    console.log('[serve-ad] No frame data found for frame:', frame);
    res.status(404).send('Frame not found');
    return;
  }

  const frameRecord = frameData[0];
  console.log('[serve-ad] Frame Data:', frameRecord);

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, campaign_details')
    .eq('id', frameRecord.campaign_id)
    .single();

  console.log('[serve-ad] Campaign Query Result:', { campaign, campaignError });

  if (campaignError) {
    console.error('[serve-ad] Campaign Query Error:', campaignError);
    res.status(404).send('Campaign not found');
    return;
  }

  if (!campaign) {
    console.log('[serve-ad] No campaign data found for campaign_id:', frameRecord.campaign_id);
    res.status(404).send('Campaign not found');
    return;
  }

  console.log('[serve-ad] Campaign Data:', campaign);

  const endDate = new Date(
    campaign.campaign_details.endDate.year,
    campaign.campaign_details.endDate.month - 1,
    campaign.campaign_details.endDate.day
  );
  const today = new Date();
  console.log('[serve-ad] End Date:', endDate, 'Today:', today);
  if (endDate < today) {
    console.log('[serve-ad] Campaign has expired. End Date:', endDate, 'Today:', today);
    res.status(400).send('Campaign has expired');
    return;
  }

  let imageUrl;
  if (frameRecord.uploaded_file.startsWith('http')) {
    imageUrl = frameRecord.uploaded_file;
  } else {
    imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/ad-creatives/${frameRecord.uploaded_file}`;
  }

  const targetUrl = campaign.campaign_details.targetURL || "https://mashdrop.com";

  console.log('[serve-ad] Final Image URL:', imageUrl);
  console.log('[serve-ad] Target URL:', targetUrl);

  try {
    const response = await fetch('https://my-ad-agency-9vlbk25px-genecats-projects.vercel.app/api/track-impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frame, campaignId: campaignId || frameRecord.campaign_id })
    });
    console.log('[serve-ad] Impression tracked:', await response.json());
  } catch (error) {
    console.error('[serve-ad] Error tracking impression:', error.message);
  }

  res.status(200).setHeader('Content-Type', 'text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ad</title>
      <style>
        html, body { margin: 0; padding: 0; border: none !important; }
        img { 
          border: none !important; 
          outline: none !important; 
          max-width: 100%; 
          max-height: 100%; 
          display: block; 
          box-shadow: none !important; 
        }
        * { border-collapse: collapse; }
      </style>
      <script>
        let isClicking = false;
        document.addEventListener('click', function(e) {
          if (e.target.tagName === 'IMG' && !isClicking) {
            isClicking = true;
            e.preventDefault();
            console.log('Click event triggered for ad');
            fetch('https://my-ad-agency-9vlbk25px-genecats-projects.vercel.app/api/track-click', {
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
      <img src="${imageUrl}" alt="Ad for Frame ${frame}" />
    </body>
    </html>
  `);
};