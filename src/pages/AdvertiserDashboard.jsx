import React from "react";
import { Link } from "react-router-dom";
import { useAdvertiserDashboardData } from "../hooks/useAdvertiserDashboardData";

function AdvertiserDashboard({ session }) {
  const { campaigns, stats, isLoading, error } = useAdvertiserDashboardData();

  if (isLoading) {
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
          { title: "Avg. Cost Per Click", value: `$${stats.avgCostPerClick.toFixed(2)}` },
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
                      campaign.isActive ? "bg-green-500" : "bg-red-500"
                    }`}
                    title={campaign.isActive ? "Active" : "Inactive"}
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
