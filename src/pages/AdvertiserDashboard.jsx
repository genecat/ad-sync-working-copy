import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';

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
        console.log('Fetched campaigns:', data);
        setCampaigns(data || []);

        const statsPromises = data.map(async (campaign) => {
          const stats = await Promise.all(campaign.selected_publishers.map(async (publisher) => {
            const frames = Object.keys(publisher.extra_details.framesChosen || {});
            console.log(`Publisher ${publisher.id} frames:`, frames);
            const frameStats = await Promise.all(frames.map(async (frame) => {
              const { data: stat, error: statError } = await supabase
                .from('ad_stats')
                .select('impression_count, click_count')
                .eq('listing_id', publisher.id)
                .eq('frame', frame)
                .single();
              if (statError) {
                console.log(`No stats for listing_id: ${publisher.id}, frame: ${frame}`);
                return { impression_count: 0, click_count: 0 };
              }
              console.log(`Stats for listing_id: ${publisher.id}, frame: ${frame}`, stat);
              return stat || { impression_count: 0, click_count: 0 };
            }));
            return { publisherId: publisher.id, stats: frameStats };
          }));
          return { campaignId: campaign.id, stats };
        });
        const campaignStats = await Promise.all(statsPromises);
        console.log('Campaign stats:', campaignStats);
        calculateStats(data, campaignStats);
      } catch (err) {
        setError(err.message);
        console.error('Fetch error:', err);
      }
    };

    fetchCampaigns();
  }, [session]);

  const calculateStats = (campaigns, campaignStats) => {
    let totalClicks = 0;
    let totalSpent = 0;
    let totalBudget = 0;
    let totalImpressions = 0;

    campaigns.forEach((campaign, index) => {
      const details = campaign.campaign_details || {};
      const budget = parseFloat(details.budget) || 0;
      const campaignStat = campaignStats[index].stats.reduce((acc, publisherStats) => {
        const frameTotals = publisherStats.stats.reduce((frameAcc, frameStat) => ({
          impression_count: (frameAcc.impression_count || 0) + (frameStat.impression_count || 0),
          click_count: (frameAcc.click_count || 0) + (frameStat.click_count || 0),
        }), {});
        return {
          impression_count: (acc.impression_count || 0) + (frameTotals.impression_count || 0),
          click_count: (acc.click_count || 0) + (frameTotals.click_count || 0),
        };
      }, {});
      const clicks = campaignStat.click_count || 0;
      const impressions = campaignStat.impression_count || 0;
      let pricePerClick = 0;

      if (Array.isArray(campaign.selected_publishers) && campaign.selected_publishers.length > 0) {
        const firstPublisher = campaign.selected_publishers[0];
        if (Array.isArray(firstPublisher.frames_purchased) && firstPublisher.frames_purchased.length > 0) {
          pricePerClick = parseFloat(firstPublisher.frames_purchased[0].pricePerClick) || 0;
        }
      }

      totalClicks += clicks;
      totalSpent += clicks * pricePerClick;
      totalBudget += budget;
      totalImpressions += impressions;

      campaign.clicks = clicks;
      campaign.impressions = impressions;
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
    <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
      <h1 className="text-3xl font-bold mb-6">Advertiser Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        {[
          { title: "Total Clicks", value: stats.totalClicks },
          { title: "Avg. Cost Per Click", value: `$${stats.avgCostPerClick}` },
          { title: "Total Budget", value: `$${stats.totalBudget.toFixed(2)}` },
          { title: "Total Spent", value: `$${stats.totalSpent.toFixed(2)}` },
          { title: "Total Remaining", value: `$${stats.totalRemaining.toFixed(2)}` },
          { title: "Total Impressions", value: stats.totalImpressions },
        ].map((stat, index) => (
          <div key={index} className="bg-modern-card shadow-card rounded-lg flex flex-col items-center justify-center text-center">
            <h2 className="text-sm text-modern-muted">{stat.title}</h2>
            <p className="text-2xl text-gray-600 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <Link to="/create-campaign" className="bg-modern-primary text-white px-4 py-2 rounded-lg shadow-md hover:bg-modern-primary-dark transition">
          Create New Campaign
        </Link>
      </div>

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
            if (Array.isArray(campaign.selected_publishers) && campaign.selected_publishers.length > 0) {
              const firstPublisher = campaign.selected_publishers[0];
              if (Array.isArray(firstPublisher.frames_purchased) && firstPublisher.frames_purchased.length > 0) {
                pricePerClick = parseFloat(firstPublisher.frames_purchased[0].pricePerClick) || 0;
              }
            }
            const totalSpent = (clicks * pricePerClick).toFixed(2);
            const totalRemaining = Math.max(0, budget - totalSpent).toFixed(2);

            return (
              <div key={campaign.id} className="p-6 bg-modern-card shadow-card rounded-lg">
                <div className="border-b pb-2 mb-4">
                  <h3 className="text-xl font-semibold">{campaignName}</h3>
                  <p>Campaign ID: {campaign.id}</p>
                  <p className="text-gray-700">Ends: {endDate}</p>
                  <p className="text-gray-700">
                    Target URL:{" "}
                    <a
                      href={targetURL.startsWith("http") ? targetURL : `http://${targetURL}`}
                      className="text-modern-primary underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {targetURL}
                    </a>
                  </p>
                  {campaign.selected_publishers && campaign.selected_publishers.length > 0 && (
                    <div>
                      <p className="text-gray-700">
                        Publisher:{" "}
                        <a
                          href={campaign.selected_publishers[0].url}
                          className="text-modern-primary underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {campaign.selected_publishers[0].website || campaign.selected_publishers[0].url || "Unknown"}
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-modern-bg shadow-card rounded-lg flex flex-col items-center justify-center text-center">
                    <strong className="text-sm text-modern-muted">Budget:</strong>
                    <span className="text-lg">${budget.toFixed(2)}</span>
                  </div>
                  <div className="bg-modern-bg shadow-card rounded-lg flex flex-col items-center justify-center text-center">
                    <strong className="text-sm text-modern-muted">Total Clicks:</strong>
                    <span className="text-lg">{clicks}</span>
                  </div>
                  <div className="bg-modern-bg shadow-card rounded-lg flex flex-col items-center justify-center text-center">
                    <strong className="text-sm text-modern-muted">Price Per Click:</strong>
                    <span className="text-lg">${pricePerClick.toFixed(2)}</span>
                  </div>
                  <div className="bg-modern-bg shadow-card rounded-lg flex flex-col items-center justify-center text-center">
                    <strong className="text-sm text-modern-muted">Total Spent:</strong>
                    <span className="text-lg">${totalSpent}</span>
                  </div>
                  <div className="bg-modern-bg shadow-card rounded-lg flex flex-col items-center justify-center text-center">
                    <strong className="text-sm text-modern-muted">Budget Left:</strong>
                    <span className="text-lg">${totalRemaining}</span>
                  </div>
                  <div className="bg-modern-bg shadow-card rounded-lg flex flex-col items-center justify-center text-center">
                    <strong className="text-sm text-modern-muted">Total Impressions:</strong>
                    <span className="text-lg">{impressions}</span>
                  </div>
                </div>

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
