import React from "react";
import { Link } from "react-router-dom";
import { usePublisherDashboardData } from "../hooks/usePublisherDashboardData";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/use-toast";

function NewPublisherDashboard({ session }) {
  const {
    websites,
    campaignStats,
    totalImpressions,
    totalClicks,
    totalEarnings,
    isLoading,
    error,
  } = usePublisherDashboardData();
  const { toast } = useToast();

  // Function to archive a campaign
  const handleArchiveCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_archived: true })
        .eq("id", campaignId);
      if (error) throw error;

      // Refresh the campaign list by refetching data
      window.location.reload(); // Simple way to refresh; we can optimize later with state management
      toast({ title: "Success", description: "Campaign archived successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
        <h1 className="text-3xl font-bold mb-6">Publisher Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, index) => (
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
      <h1 className="text-3xl font-bold mb-6">Publisher Dashboard</h1>

      {error && (
        <div className="mb-6 text-red-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { title: "Total Campaigns", value: campaignStats.length },
          { title: "Total Impressions", value: totalImpressions },
          { title: "Total Clicks", value: totalClicks },
          { title: "Total Earnings", value: `$${totalEarnings.toFixed(2)}` },
        ].map((stat, index) => (
          <div key={index} className="bg-modern-card shadow-card rounded-lg flex flex-col items-center justify-center text-center">
            <h2 className="text-sm text-modern-muted">{stat.title}</h2>
            <p className="text-2xl text-gray-600 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <Link to="/create-listing" className="bg-modern-primary text-white px-4 py-2 rounded-lg shadow-md hover:bg-modern-primary-dark transition">
          Create New Listing
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-4">Websites</h2>
      {Object.keys(websites).length > 0 ? (
        Object.entries(websites).map(([website, listings]) => (
          <div key={website} className="mb-4">
            <h3 className="text-xl font-semibold mb-2">{website}</h3>
            <div className="space-y-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-4 bg-modern-card shadow-card rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Listing ID: {listing.id}
                    </p>
                    <p className="text-sm">
                      Frames:{" "}
                      {Object.keys(listing.selected_frames).join(", ") || "None"}
                    </p>
                  </div>
                  <Link
                    to={`/edit-listing/${listing.id}`}
                    className="bg-modern-primary text-white px-4 py-2 rounded-lg shadow-md hover:bg-modern-primary-dark transition"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p>No websites found.</p>
      )}

      <h2 className="text-2xl font-bold mb-4 mt-6">Live Campaigns</h2>
      {campaignStats.length > 0 ? (
        campaignStats.map((campaign) => (
          <div
            key={`${campaign.listing_id}-${campaign.frame}`}
            className="p-4 bg-modern-card shadow-card rounded-lg mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {campaign.campaigns?.name || "Unknown"}
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-4 h-4 rounded-full ${
                    campaign.isActive ? "bg-green-500" : "bg-red-500"
                  }`}
                  title={campaign.isActive ? "Active" : "Inactive"}
                ></span>
                <button
                  onClick={() => handleArchiveCampaign(campaign.campaign_id)}
                  className="bg-gray-500 text-white px-4 py-1 rounded-lg hover:bg-gray-600 transition"
                >
                  Archive
                </button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Stats Card */}
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  Campaign Title: {campaign.campaigns?.name || "Unknown"}
                </p>
                <p className="text-sm">
                  Frame: {campaign.frame || "Unknown"}
                </p>
                <p className="text-sm">
                  Price Per Click: ${campaign.pricePerClick?.toFixed(2) || "0.00"}
                </p>
                <p className="text-sm">
                  Total Impressions: {campaign.impression_count}
                </p>
                <p className="text-sm">
                  Total Clicks: {campaign.click_count}
                </p>
                <p className="text-sm">
                  Termination Date: {campaign.campaigns?.termination_date || "N/A"}
                </p>
              </div>
              {/* Ad Creative Card */}
              <div className="w-full md:w-24 flex-shrink-0">
                {campaign.uploaded_file ? (
                  <img
                    src={campaign.uploaded_file}
                    alt="Ad Creative"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-100 flex items-center justify-center rounded-lg">
                    <p className="text-sm text-gray-500">No Image</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <p>No active campaigns found.</p>
      )}
    </div>
  );
}

export default NewPublisherDashboard;
