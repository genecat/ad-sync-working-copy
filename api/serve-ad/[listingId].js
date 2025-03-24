import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }

  const listingId = req.params?.listingId || req.query?.listingId;
  const frame = req.query.frame;
  const campaignId = req.query.campaignId;

  console.log("Request URL:", req.url);
  console.log("req.params:", req.params);
  console.log("req.query:", req.query);
  console.log("Listing ID:", listingId, "Frame:", frame, "Campaign ID:", campaignId);

  if (!frame) {
    console.log("Missing Frame Parameter:", { frame });
    res.status(400).send('Missing frame parameter');
    return;
  }

  // Fetch frame data from the frames table
  console.log("Querying frames table with frame_id:", frame);
  const { data: frameData, error: frameError } = await supabase
    .from('frames')
    .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
    .eq('frame_id', frame);

  console.log("Frame Query Result:", { frameData, frameError });

  if (frameError) {
    console.error("Frame Query Error:", frameError);
    res.status(500).send('Error fetching frame data');
    return;
  }

  if (!frameData || frameData.length === 0) {
    console.log("No frame data found for frame:", frame);
    res.status(404).send('Frame not found');
    return;
  }

  // Since frameData is an array, take the first element
  const frameRecord = frameData[0];
  console.log("Frame Data:", frameRecord);

  // Fetch campaign data to get target URL and check if active
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, campaign_details')
    .eq('id', frameRecord.campaign_id)
    .single();

  console.log("Campaign Query Result:", { campaign, campaignError });

  if (campaignError) {
    console.error("Campaign Query Error:", campaignError);
    res.status(404).send('Campaign not found');
    return;
  }

  if (!campaign) {
    console.log("No campaign data found for campaign_id:", frameRecord.campaign_id);
    res.status(404).send('Campaign not found');
    return;
  }

  console.log("Campaign Data:", campaign);

  // Check if campaign is active based on endDate
  const endDate = new Date(
    campaign.campaign_details.endDate.year,
    campaign.campaign_details.endDate.month - 1,
    campaign.campaign_details.endDate.day
  );
  const today = new Date();
  console.log("End Date:", endDate, "Today:", today);
  if (endDate < today) {
    console.log("Campaign has expired. End Date:", endDate, "Today:", today);
    res.status(400).send('Campaign has expired');
    return;
  }

  const imageUrl = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${frameRecord.uploaded_file}`;
  const targetUrl = campaign.campaign_details.targetURL || "https://mashdrop.com";

  console.log("Final Image URL:", imageUrl);
  console.log("Target URL:", targetUrl);

  res.status(200).setHeader('Content-Type', 'text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ad</title>
      <script>
        document.addEventListener('click', function(e) {
          if (e.target.tagName === 'IMG') {
            e.preventDefault();
            console.log('Click event triggered for ad');
            fetch('https://my-ad-agency-8pi84mba0-genecats-projects.vercel.app/api/track-click', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame: '${frame}', campaignId: '${campaignId || frameRecord.campaign_id}' })
            }).then(response => {
              if (response.ok) {
                window.open('${targetUrl}', '_blank');
              } else {
                window.open('${targetUrl}', '_blank');
              }
            }).catch(error => {
              window.open('${targetUrl}', '_blank');
            });
          }
        });
      </script>
    </head>
    <body>
      <img src="${imageUrl}" width="${frameRecord.size.split('x')[0]}" height="${frameRecord.size.split('x')[1]}" style="border:none; max-width: 100%; max-height: 100%;" alt="Ad for Frame ${frame}" />
    </body>
    </html>
  `);
};