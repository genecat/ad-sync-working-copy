import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';

function AdvertiserDashboard({ session }) {
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalClicks: 0,
    avgCostPerClick: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    totalImpressions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !session.user || !session.user.id) {
      setLoading(false);
      return;
    }

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch campaigns
        const { data: campaignsData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('advertiser_id', session.user.id);
        if (campaignError) throw campaignError;
        console.log('All Campaigns Data:', campaignsData);
        if (!campaignsData || campaignsData.length === 0) {
          setCampaigns([]);
          setStats(prev => ({ ...prev, totalCampaigns: 0 }));
          setLoading(false);
          return;
        }

        // Remove duplicates based on campaign name or title
        const uniqueCampaigns = [];
        const seenTitles = new Set();
        campaignsData.forEach(campaign => {
          const title = campaign.campaign_details?.title || campaign.name || campaign.id;
          if (!seenTitles.has(title)) {
            seenTitles.add(title);
            uniqueCampaigns.push(campaign);
          } else {
            console.warn(`Duplicate campaign detected and skipped: ${title}`);
          }
        });
        console.log('Unique Campaigns:', uniqueCampaigns);

        // Set total campaigns count
        setStats(prev => ({ ...prev, totalCampaigns: uniqueCampaigns.length }));

        // Extract listing IDs from selected_publishers
        const listingIds = uniqueCampaigns.flatMap(campaign =>
          (campaign.selected_publishers || []).map(publisher => publisher.id).filter(Boolean)
        );
        console.log('Listing IDs from selected_publishers:', listingIds);
        if (listingIds.length === 0) {
          console.warn('No listing IDs found in selected_publishers');
          setCampaigns(uniqueCampaigns.map(campaign => ({ ...campaign, clicks: 0, impressions: 0 })));
          setLoading(false);
          return;
        }

        // Fetch ad_stats
        const { data: statsData, error: statsError } = await supabase
          .from('ad_stats')
          .select('listing_id, frame, impression_count, click_count')
          .in('listing_id', listingIds);
        if (statsError) {
          console.error('Stats fetch error:', statsError.message);
          throw statsError;
        }
        console.log('All ad_stats Data:', statsData);

        // Aggregate stats by listing_id
        const statsMap = {};
        statsData.forEach(stat => {
          if (!statsMap[stat.listing_id]) {
            statsMap[stat.listing_id] = { impression_count: 0, click_count: 0 };
          }
          statsMap[stat.listing_id].impression_count += stat.impression_count || 0;
          statsMap[stat.listing_id].click_count += stat.click_count || 0;
        });
        console.log('Stats Map (by listing_id):', statsMap);

        // Update campaigns with stats
        const updatedCampaigns = uniqueCampaigns.map(campaign => {
          let campaignClicks = 0;
          let campaignImpressions = 0;
          (campaign.selected_publishers || []).forEach(publisher => {
            const listingId = publisher.id;
            const listingStats = statsMap[listingId];
            if (listingStats) {
              campaignClicks += listingStats.click_count;
              campaignImpressions += listingStats.impression_count;
            } else {
              console.warn(`No stats found for listing_id: ${listingId} in campaign ${campaign.id}`);
            }
          });
          console.log(`Campaign ${campaign.id} - Clicks: ${campaignClicks}, Impressions: ${campaignImpressions}`);
          return { ...campaign, clicks: campaignClicks, impressions: campaignImpressions };
        });

        calculateStats(updatedCampaigns);
      } catch (err) {
        setError(err.message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [session]);

  const calculateStats = (campaigns) => {
    let totalClicks = 0;
    let totalSpent = 0;
    let totalBudget = 0;
    let totalImpressions = 0;

    const updatedCampaigns = campaigns.map(campaign => {
      const details = campaign.campaign_details || {};
      const budget = parseFloat(details.budget) || 0;
      const clicks = campaign.clicks || 0;
      const impressions = campaign.impressions || 0;
      let pricePerClick = 0;

      if (Array.isArray(campaign.selected_publishers) && campaign.selected_publishers.length > 0) {
        const firstPublisher = campaign.selected_publishers[0];
        if (Array.isArray(firstPublisher.frames_purchased) && firstPublisher.frames_purchased.length > 0) {
          pricePerClick = parseFloat(firstPublisher.frames_purchased[0].pricePerClick) || 0;
        } else if (firstPublisher.extra_details?.framesChosen && Object.keys(firstPublisher.extra_details.framesChosen).length > 0) {
          const firstFrame = Object.values(firstPublisher.extra_details.framesChosen)[0];
          pricePerClick = parseFloat(firstFrame.pricePerClick) || 0;
        }
      }

      const campaignTotalSpent = clicks * pricePerClick;
      totalClicks += clicks;
      totalSpent += campaignTotalSpent;
      totalBudget += budget;
      totalImpressions += impressions;

      // Determine if the campaign is active
      const currentDate = new Date();
      const createdAt = new Date(campaign.created_at);
      const endDate = details.endDate
        ? new Date(
            `${details.endDate.year}-${String(details.endDate.month).padStart(2, '0')}-${String(details.endDate.day).padStart(2, '0')}`
          )
        : null;

      // Debug logs
      console.log(`Campaign ${campaign.id}:`);
      console.log(`  Current Date: ${currentDate}`);
      console.log(`  Created At: ${createdAt}`);
      console.log(`  End Date: ${endDate}`);
      console.log(`  Budget: ${budget}, Total Spent: ${campaignTotalSpent}`);

      const isWithinDateRange =
        createdAt <= currentDate && (!endDate || endDate >= currentDate);
      const isWithinBudget = campaignTotalSpent < budget;
      const isActive = isWithinDateRange && isWithinBudget;

      console.log(`  isWithinDateRange: ${isWithinDateRange}`);
      console.log(`  isWithinBudget: ${isWithinBudget}`);
      console.log(`  isActive: ${isActive}`);

      return {
        ...campaign,
        clicks,
        impressions,
        pricePerClick,
        isActive,
      };
    });

    const avgCostPerClick = totalClicks > 0 ? (totalSpent / totalClicks).toFixed(2) : "0.00";
    const totalRemaining = Math.max(0, totalBudget - totalSpent);

    setCampaigns(updatedCampaigns);
    setStats(prev => ({
      ...prev,
      totalClicks,
      avgCostPerClick,
      totalBudget,
      totalSpent,
      totalRemaining,
      totalImpressions,
    }));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
        <h1 className="text-3xl font-bold mb-6">Advertiser Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-modern-card shadow-card rounded-lg h-24 animate-pulse" />
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="p-6 bg-modern-card shadow-card rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
      <h1 className="text-3xl font-bold mb-6">Advertiser Dashboard</h1>

      {error && (
        <div className="mb-6 text-red-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        {[
          { title: "Total Campaigns", value: stats.totalCampaigns },
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
            const pricePerClick = campaign.pricePerClick || 0;
            const totalSpent = (clicks * pricePerClick).toFixed(2);
            const totalRemaining = Math.max(0, budget - totalSpent).toFixed(2);

            return (
              <div key={campaign.id} className="p-6 bg-modern-card shadow-card rounded-lg">
                <div className="border-b pb-2 mb-4 flex items-center">
                  <h3 className="text-xl font-semibold flex-grow">{campaignName}</h3>
                  <span
                    className={`inline-block w-4 h-4 rounded-full mr-2 ${
                      campaign.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    title={campaign.isActive ? 'Active' : 'Inactive'}
                  ></span>
                </div>
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
