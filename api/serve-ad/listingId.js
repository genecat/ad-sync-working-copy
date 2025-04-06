import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.removeHeader('X-Frame-Options');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const listingId = req.query?.listingId || req.params?.listingId;
  const frame = req.query?.frame;
  const campaignId = req.query?.campaignId;

  if (!frame) {
    return res.status(400).send('Missing frame parameter');
  }

  const { data: frameData, error: frameError } = await supabase
    .from('frames')
    .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
    .eq('frame_id', frame);

  if (frameError || !frameData || frameData.length === 0) {
    return res.status(200).send(''); // Do not error out, return blank
  }

  const frameRecord = frameData[0];

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, campaign_details, status')
    .eq('id', frameRecord.campaign_id)
    .single();

  if (campaignError || !campaign || campaign.status !== 'approved') {
    return res.status(200).send(''); // Return blank if not approved or missing
  }

  const endDate = new Date(
    campaign.campaign_details.endDate.year,
    campaign.campaign_details.endDate.month - 1,
    campaign.campaign_details.endDate.day
  );

  const today = new Date();
  if (endDate < today) {
    return res.status(200).send(''); // Campaign expired: show nothing
  }

  let imageUrl = frameRecord.uploaded_file.startsWith('http')
    ? frameRecord.uploaded_file
    : `${process.env.SUPABASE_URL}/storage/v1/object/public/ad-creatives/${frameRecord.uploaded_file}`;

  const targetUrl = campaign.campaign_details.targetURL || 'https://mashdrop.com';

  try {
    await fetch('https://adsync.vendomedia.net/api/record-impression?frame=' + frame + '&campaignId=' + (campaignId || frameRecord.campaign_id), {
      method: 'GET',
      mode: 'no-cors'
    });
  } catch (error) {
    console.error('[track-impression] Error:', error.message);
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
            fetch('https://adsync.vendomedia.net/api/record-click?frame=${frame}&campaignId=${campaignId || frameRecord.campaign_id}', {
              method: 'GET',
              mode: 'no-cors'
            }).then(() => {
              window.open('${targetUrl}', '_blank');
              isClicking = false;
            }).catch(error => {
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
