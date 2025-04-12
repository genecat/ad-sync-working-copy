import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

const ServeAd = () => {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listingId');
  const frameId = searchParams.get('frame');
  const [adData, setAdData] = useState(null);

  useEffect(() => {
    console.log('Query string:', searchParams.toString());
    console.log('listingId:', listingId);
    console.log('frameId:', frameId);

    const fetchAd = async () => {
      if (!listingId || !frameId) {
        setAdData({ error: 'Missing listingId or frameId' });
        return;
      }

      try {
        const { data: campaigns, error } = await supabase
          .from('campaigns')
          .select('id, campaign_details, selected_publishers')
          .eq('status', 'approved')
          .eq('is_active', true);

        if (error) {
          throw error;
        }

        let adUrl = null;
        let targetUrl = null;
        let campaignId = null;

        for (const campaign of campaigns) {
          const publishers = campaign.selected_publishers || [];
          const publisherMatch = publishers.find(publisher => 
            publisher.id === listingId && 
            publisher.extra_details?.framesChosen?.[frameId]
          );

          if (publisherMatch) {
            adUrl = publisherMatch.frames_purchased?.[0]?.uploadedFile;
            targetUrl = campaign.campaign_details?.targetURL;
            campaignId = campaign.id;
            break;
          }
        }

        if (adUrl && targetUrl) {
          setAdData({ adUrl, targetUrl, campaignId });
          await supabase
            .from('impressions')
            .insert({ campaign_id: campaignId, frame_id: frameId });
        } else {
          setAdData({ error: 'No active ad found for this frame' });
        }
      } catch (error) {
        console.error('Error fetching ad:', error);
        setAdData({ error: error.message });
      }
    };

    fetchAd();
  }, [listingId, frameId]);

  if (!adData) {
    return <div>Loading ad...</div>;
  }

  if (adData.error) {
    return <div>Error: {adData.error}</div>;
  }

  return (
    <a href={adData.targetUrl} target="_blank" rel="noopener noreferrer">
      <img src={adData.adUrl} alt="Advertisement" style={{ width: '100%', height: '100%' }} />
    </a>
  );
};

export default ServeAd;

