import React, { useEffect, useState } from 'react';
import { supabase } from "../lib/supabaseClient";

function CampaignDashboard({ session }) {
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
        .select(`
          *,
          impressions (campaign_id, count(*) as impression_count),
          clicks (campaign_id, count(*) as click_count),
          frames (frame_id, listing_id, pricing_model, price_per_click, cpm)
        `)
        .eq('advertiser_id', session.user.id);
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
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Impressions</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Clicks</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Pricing Model</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Price</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const details = campaign.campaign_details || {};
                const endDate = details.endDate
                  ? `${details.endDate.year}-${details.endDate.month}-${details.endDate.day}`
                  : 'N/A';
                const impressions = campaign.impressions?.[0]?.impression_count || 0;
                const clicks = campaign.clicks?.[0]?.click_count || 0;
                const pricingModel = campaign.frames?.[0]?.pricing_model || "CPC";
                const pricePerClick = campaign.frames?.[0]?.price_per_click || 0;
                const cpm = campaign.frames?.[0]?.cpm || 0;
                const totalSpent = pricingModel === "CPC" 
                  ? (clicks * pricePerClick).toFixed(2) 
                  : ((impressions / 1000) * cpm).toFixed(2);
                const price = pricingModel === "CPC" 
                  ? `$${pricePerClick.toFixed(2)} per click` 
                  : `$${cpm.toFixed(2)} CPM`;

                return (
                  <tr key={campaign.id} className="border-b">
                    <td className="px-6 py-4 whitespace-nowrap">{campaign.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${details.budget || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${details.dailyLimit || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {details.targetURL ? (
                        <a
                          href={details.targetURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          {details.targetURL}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{endDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{impressions}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{clicks}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{pricingModel}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{price}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${totalSpent}</td>
                  </tr>
                );
              })}
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