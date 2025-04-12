import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

const CheckAdStatus = () => {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listingId');
  const frameId = searchParams.get('frameId');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (!listingId || !frameId) {
        setStatus({ isActive: false, error: 'Missing listingId or frameId' });
        return;
      }

      try {
        const { data: campaigns, error } = await supabase
          .from('campaigns')
          .select('id, is_active, status, selected_publishers')
          .eq('status', 'approved')
          .eq('is_active', true);

        if (error) {
          throw error;
        }

        let isActive = false;
        for (const campaign of campaigns) {
          const publishers = campaign.selected_publishers || [];
          const publisherMatch = publishers.some(publisher => 
            publisher.id === listingId && 
            publisher.extra_details?.framesChosen?.[frameId]
          );
          if (publisherMatch) {
            isActive = true;
            break;
          }
        }

        setStatus({ isActive });
      } catch (error) {
        console.error('Error checking ad status:', error);
        setStatus({ isActive: false, error: error.message });
      }
    };

    checkStatus();
  }, [listingId, frameId]);

  if (!status) {
    return null;
  }

  return (
    <>
      {status.error ? (
        <p>Error: {status.error}</p>
      ) : (
        <>{JSON.stringify({ isActive: status.isActive })}</>
      )}
    </>
  );
};

export default CheckAdStatus;