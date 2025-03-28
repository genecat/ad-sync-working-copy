import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// In-memory store to track used frames (temporary, resets on deployment)
const usedFrames = new Set();

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'Preflight successful' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listingId, slotId } = req.query;

  if (!listingId || !slotId) {
    return res.status(400).json({ error: 'Missing required query parameters: listingId and slotId' });
  }

  try {
    const { data: frames, error: framesError } = await supabase
      .from('frames')
      .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
      .eq('listing_id', listingId);

    if (framesError) {
      console.error('[serve-active-ad] Error fetching frames:', framesError);
      return res.status(500).json({ error: 'Error fetching frames' });
    }

    if (!frames || frames.length === 0) {
      console.log('[serve-active-ad] No frames found for listingId:', listingId);
      return res.status(404).send('');
    }

    for (const frame of frames) {
      // Skip if this frame has already been used in another slot
      if (usedFrames.has(frame.frame_id)) {
        console.log('[serve-active-ad] Frame already used:', frame.frame_id);
        continue;
      }

      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('campaign_details')
        .eq('id', frame.campaign_id)
        .single();

      if (campaignError || !campaign) {
        console.log('[serve-active-ad] Campaign not found for frame:', frame.frame_id);
        continue;
      }

      const endDate = new Date(
        campaign.campaign_details.endDate.year,
        campaign.campaign_details.endDate.month - 1,
        campaign.campaign_details.endDate.day
      );
      const today = new Date();

      const { count: clicks, error: clicksError } = await supabase
        .from('clicks')
        .select('*', { count: 'exact', head: true })
        .eq('frame_id', frame.frame_id);

      if (clicksError) {
        console.error('[serve-active-ad] Error fetching clicks:', clicksError);
        continue;
      }

      const budget = parseFloat(campaign.campaign_details.budget) || 0;
      const pricePerClick = parseFloat(frame.price_per_click) || 0;
      const spent = clicks * pricePerClick;

      const isActive = endDate >= today && (budget === 0 || spent < budget);

      if (isActive) {
        usedFrames.add(frame.frame_id); // Mark this frame as used
        const imageUrl = frame.uploaded_file.startsWith('http')
          ? frame.uploaded_file
          : `${process.env.SUPABASE_URL}/storage/v1/object/public/ad-creatives/${frame.uploaded_file}`;
        const targetUrl = campaign.campaign_details.targetURL || 'https://mashdrop.com';
        const [width, height] = frame.size ? frame.size.split('x').map(Number) : [300, 250];

        return res.status(200).setHeader('Content-Type', 'text/html').send(`
          <div class="ad-slot" id="ad-slot-${frame.frame_id}" style="width: ${width}px; height: ${height}px;">
            <a href="${targetUrl}" target="_blank" id="ad-link-${frame.frame_id}">
              <img src="${imageUrl}" style="border:none; max-width: 100%; max-height: 100%;" alt="Ad for ${frame.frame_id}" id="ad-image-${frame.frame_id}"/>
            </a>
          </div>
          <script>
            (function() {
              console.log('[Ad Debug] Origin:', window.location.origin);
              console.log('[Ad Debug] Current URL:', window.location.href);
              fetch('https://my-ad-agency-q1wsatv8c-genecats-projects.vercel.app/api/record-impression?frame=${frame.frame_id}&campaignId=${frame.campaign_id}')
                .then(response => response.json())
                .then(data => console.log('[Ad] Impression tracked for ${frame.frame_id}:', data))
                .catch(err => console.error('[Ad] Impression tracking failed for ${frame.frame_id}:', err));
              const adLink = document.getElementById('ad-link-${frame.frame_id}');
              adLink.addEventListener('click', function(e) {
                e.preventDefault();
                fetch('https://my-ad-agency-q1wsatv8c-genecats-projects.vercel.app/api/record-click?frame=${frame.frame_id}&campaignId=${frame.campaign_id}')
                  .then(response => response.json())
                  .then(data => {
                    console.log('[Ad] Click tracked for ${frame.frame_id}:', data);
                    window.open('${targetUrl}', '_blank');
                  })
                  .catch(err => {
                    console.error('[Ad] Click tracking failed for ${frame.frame_id}:', err);
                    window.open('${targetUrl}', '_blank');
                  });
              });
            })();
          </script>
        `);
      }
    }

    console.log('[serve-active-ad] No active frames found for listingId:', listingId);
    return res.status(404).send('');
  } catch (error) {
    console.error('[serve-active-ad] Server error:', error);
    return res.status(500).send('');
  }
};