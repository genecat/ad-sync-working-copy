import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[generate-embed] Handling OPTIONS request');
    return res.status(200).end();
  }

  const { frameId } = req.query;

  if (!frameId) {
    console.log('[generate-embed] Missing frameId');
    return res.status(400).json({ error: 'Missing frameId' });
  }

  try {
    // Fetch frame data
    const { data: frameData, error: frameError } = await supabase
      .from('frames')
      .select('frame_id, campaign_id, uploaded_file, size')
      .eq('frame_id', frameId)
      .single();

    if (frameError || !frameData) {
      console.log('[generate-embed] Frame not found:', frameError);
      return res.status(404).json({ error: 'Frame not found' });
    }

    // Fetch campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, campaign_details')
      .eq('id', frameData.campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.log('[generate-embed] Campaign not found:', campaignError);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const imageUrl = frameData.uploaded_file.startsWith('http')
      ? frameData.uploaded_file
      : `${process.env.SUPABASE_URL}/storage/v1/object/public/ad-creatives/${frameData.uploaded_file}`;
    const targetUrl = campaign.campaign_details.targetURL || 'https://mashdrop.com';
    const [width, height] = frameData.size ? frameData.size.split('x').map(Number) : [300, 250];

    // Generate the embed code as a script tag
    const embedCode = `
      <div class="ad-slot" id="ad-slot-${frameData.frame_id}" style="width: ${width}px; height: ${height}px;">
        <a href="${targetUrl}" target="_blank" id="ad-link-${frameData.frame_id}">
          <img 
            src="${imageUrl}" 
            style="border:none; max-width: 100%; max-height: 100%;" 
            alt="Ad for ${frameData.frame_id}"
            onload="console.log('Ad image loaded successfully for ${frameData.frame_id}')"
            onerror="console.error('Ad image failed to load for ${frameData.frame_id}')"
          />
        </a>
      </div>
      <script>
        (function() {
          // Impression tracking
          fetch('https://adsync.vendomedia.net/api/track-impression', {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame: '${frameData.frame_id}', campaignId: '${campaign.id}' })
          }).then(() => console.log('Impression tracked for ${frameData.frame_id}'))
            .catch(err => console.error('Impression tracking failed for ${frameData.frame_id}:', err));

          // Click tracking
          document.getElementById('ad-link-${frameData.frame_id}').addEventListener('click', function(e) {
            e.preventDefault();
            fetch('https://adsync.vendomedia.net/api/track-click', {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame: '${frameData.frame_id}', campaignId: '${campaign.id}' })
            }).then(() => {
              console.log('Click tracked for ${frameData.frame_id}');
              window.open('${targetUrl}', '_blank');
            }).catch(err => {
              console.error('Click tracking failed for ${frameData.frame_id}:', err);
              window.open('${targetUrl}', '_blank');
            });
          });
        })();
      </script>
    `;

    res.status(200).json({ embedCode });
  } catch (error) {
    console.error('[generate-embed] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
