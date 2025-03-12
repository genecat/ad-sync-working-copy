import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

function AdvertiserDashboard({ session }) {
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalClicks: 0,
    avgCostPerClick: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    totalImpressions: 0,
  });

  useEffect(() => {
    if (!session || !session.user || !session.user.id) return;

    const fetchCampaigns = async () => {
      try {
        setError(null);
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('advertiser_id', session.user.id);
        if (error) throw error;
        setCampaigns(data || []);
        calculateStats(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchCampaigns();
  }, [session]);

  const calculateStats = (campaigns) => {
    let totalClicks = 0;
    let totalSpent = 0;
    let totalBudget = 0;
    let totalImpressions = 0;

    campaigns.forEach((campaign) => {
      const details = campaign.campaign_details || {};
      const budget = parseFloat(details.budget) || 0;
      const clicks = campaign.clicks || 0;
      const impressions = campaign.impressions || 0;
      let pricePerClick = 0;

      if (
        Array.isArray(campaign.selected_publishers) &&
        campaign.selected_publishers.length > 0
      ) {
        const firstPublisher = campaign.selected_publishers[0];
        if (
          Array.isArray(firstPublisher.frames_purchased) &&
          firstPublisher.frames_purchased.length > 0
        ) {
          pricePerClick = parseFloat(firstPublisher.frames_purchased[0].pricePerClick) || 0;
        }
      }

      totalClicks += clicks;
      totalSpent += clicks * pricePerClick;
      totalBudget += budget;
      totalImpressions += impressions;
    });

    const avgCostPerClick = totalClicks > 0 ? (totalSpent / totalClicks).toFixed(2) : "0.00";
    const totalRemaining = Math.max(0, totalBudget - totalSpent);

    setStats({
      totalClicks,
      avgCostPerClick,
      totalBudget,
      totalSpent,
      totalRemaining,
      totalImpressions,
    });
  };

  return (
    <div className="max-w-5xl mx-auto my-10 px-4 bg-white text-black">
      <h1 className="text-3xl font-bold mb-6">Advertiser Dashboard</h1>

      {/* Aggregate Totals Section */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        {[
          { title: "Total Clicks", value: stats.totalClicks },
          { title: "Avg. Cost Per Click", value: `$${stats.avgCostPerClick}` },
          { title: "Total Budget", value: `$${stats.totalBudget.toFixed(2)}` },
          { title: "Total Spent", value: `$${stats.totalSpent.toFixed(2)}` },
          { title: "Total Remaining", value: `$${stats.totalRemaining.toFixed(2)}` },
          { title: "Total Impressions", value: stats.totalImpressions },
        ].map((stat, index) => (
          <div key={index} className="p-4 bg-gray-100 shadow-md rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700">{stat.title}</h2>
            <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* My Campaigns Section */}
      <h2 className="text-2xl font-bold mb-4">My Campaigns</h2>
      {campaigns.length === 0 ? (
        <p>No campaigns found.</p>
      ) : (
        <div className="space-y-6">
          {campaigns.map((campaign) => {
            const details = campaign.campaign_details || {};
            const campaignName = details.title || campaign.name || "Untitled Campaign";
            const endDate = details.endDate
              ? `${details.endDate.year}/${details.endDate.month}/${details.endDate.day}`
              : "N/A";
            const targetURL = details.targetURL || "N/A";
            const budget = parseFloat(details.budget) || 0;
            const clicks = campaign.clicks || 0;
            const impressions = campaign.impressions || 0;
            let pricePerClick = 0;
            if (
              Array.isArray(campaign.selected_publishers) &&
              campaign.selected_publishers.length > 0
            ) {
              const firstPublisher = campaign.selected_publishers[0];
              if (
                Array.isArray(firstPublisher.frames_purchased) &&
                firstPublisher.frames_purchased.length > 0
              ) {
                pricePerClick = parseFloat(firstPublisher.frames_purchased[0].pricePerClick) || 0;
              }
            }
            const totalSpent = (clicks * pricePerClick).toFixed(2);
            const totalRemaining = Math.max(0, budget - totalSpent).toFixed(2);

            return (
              <div key={campaign.id} className="p-6 bg-white shadow-md rounded-lg border border-gray-200">
                {/* Campaign Header */}
                <div className="border-b pb-2 mb-4">
                  <h3 className="text-xl font-semibold">{campaignName}</h3>
                  <p className="text-gray-700">Ends: {endDate}</p>
                  <p className="text-gray-700">
                    Target URL:{" "}
                    <a
                      href={targetURL.startsWith("http") ? targetURL : `http://${targetURL}`}
                      className="text-blue-500 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {targetURL}
                    </a>
                  </p>
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-gray-100 shadow rounded-lg">
                    <strong>Budget:</strong> ${budget.toFixed(2)}
                  </div>
                  <div className="p-4 bg-gray-100 shadow rounded-lg">
                    <strong>Total Clicks:</strong> {clicks}
                  </div>
                  <div className="p-4 bg-gray-100 shadow rounded-lg">
                    <strong>Price Per Click:</strong> ${pricePerClick.toFixed(2)}
                  </div>
                  <div className="p-4 bg-gray-100 shadow rounded-lg">
                    <strong>Total Spent:</strong> ${totalSpent}
                  </div>
                  <div className="p-4 bg-gray-100 shadow rounded-lg">
                    <strong>Budget Left:</strong> ${totalRemaining}
                  </div>
                  <div className="p-4 bg-gray-100 shadow rounded-lg">
                    <strong>Total Impressions:</strong> {impressions}
                  </div>
                </div>

                {/* Campaign Ad Creative */}
                <div className="text-center mt-4">
                  {campaign.selected_publishers &&
                  campaign.selected_publishers.length > 0 &&
                  campaign.selected_publishers[0].frames_purchased &&
                  campaign.selected_publishers[0].frames_purchased.length > 0 ? (
                    <img
                      src={`https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${campaign.selected_publishers[0].frames_purchased[0].uploadedFile}`}
                      alt="Campaign Ad"
                      className="max-w-full rounded-lg"
                    />
                  ) : (
                    <p>No ad creative available.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdvertiserDashboard;
