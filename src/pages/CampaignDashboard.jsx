import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with your project URL and anon key
const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

function CampaignDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all campaigns on component mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*');
      if (error) {
        console.error('Error fetching campaigns:', error);
        setError(error.message);
      } else {
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Campaign Dashboard</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}
      {loading ? (
        <p className="text-center">Loading campaigns...</p>
      ) : campaigns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-lg rounded-lg overflow-hidden">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Campaign Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Budget</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Daily Limit</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Target URL</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">End Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b">
                  <td className="px-6 py-4 whitespace-nowrap">{campaign.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${campaign.campaign_details?.budget || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${campaign.campaign_details?.dailyLimit || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {campaign.campaign_details?.targetURL ? (
                      <a
                        href={campaign.campaign_details.targetURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {campaign.campaign_details.targetURL}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {campaign.campaign_details?.endDate
                      ? `${campaign.campaign_details.endDate.year}-${campaign.campaign_details.endDate.month}-${campaign.campaign_details.endDate.day}`
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center">No campaigns found.</p>
      )}
    </div>
  );
}

export default CampaignDashboard;
