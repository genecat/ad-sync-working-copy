import React from "react";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import { usePublisherDashboardData } from "../hooks/usePublisherDashboardData";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/use-toast";

function NewPublisherDashboard({ session }) {
  const {
    websites,
    campaignStats,
    pendingCampaigns,
    totalImpressions,
    totalClicks,
    totalEarnings,
    isLoading,
    error,
  } = usePublisherDashboardData();
  const { toast } = useToast();
  const navigate = useNavigate(); // For manual navigation

  const liveCampaigns = campaignStats.filter(campaign => campaign.status !== "archived");
  const archivedCampaigns = campaignStats.filter(campaign => campaign.status === "archived");

  const handleArchiveCampaign = async (campaignId: string) => {
    try {
      console.log("Archiving campaign with ID:", campaignId);
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "archived" })
        .eq("id", campaignId);
      if (error) {
        console.error("Error archiving campaign:", error);
        throw error;
      }
      toast({ title: "Success", description: "Campaign archived successfully." });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Caught error in handleArchiveCampaign:", err);
      toast({ title: "Error", description: err.message });
    }
  };

  const handleRestoreCampaign = async (campaignId: string) => {
    try {
      console.log("Restoring campaign with ID:", campaignId);
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "approved" })
        .eq("id", campaignId);
      if (error) {
        console.error("Error restoring campaign:", error);
        throw error;
      }
      toast({ title: "Success", description: "Campaign restored successfully." });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Caught error in handleRestoreCampaign:", err);
      toast({ title: "Error", description: err.message });
    }
  };

  const handleCampaignDecision = async (campaignId: string, status: string) => {
    try {
      console.log(`Attempting to update campaign ${campaignId} with status: ${status}`);
      const { data, error } = await supabase
        .from("campaigns")
        .update({ status })
        .eq("id", campaignId)
        .select()
        .single();
      if (error) throw error;
      console.log("Update successful, updated campaign:", data);
      toast({ title: "Success", description: `Campaign ${status}.` });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Error updating campaign status:", err);
      toast({ title: "Error", description: err.message });
    }
  };

  const handleModifyListing = (listingId) => {
    if (!listingId) {
      console.error("No listing ID provided for redirect");
      toast({ title: "Error", description: "Invalid listing ID" });
      return;
    }
    console.log("Redirecting to /edit-listing/", listingId);
    navigate(`/edit-listing/${listingId}`); // Force redirect
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
          { title: "Total Campaigns", value: liveCampaigns.length },
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
        <Link to="/create-listing-final" className="bg-modern-primary text-white px-4 py-2 rounded-lg shadow-md hover:bg-modern-primary-dark transition">
          Create New Listing
        </Link>
      </div>
      <h2 className="text-2xl font-bold mb-4">My Listings</h2>
      {Object.keys(websites).length > 0 ? (
        Object.entries(websites).map(([website, listings], index) => (
          <div key={website} className="mb-4">
            <h3 className="text-xl font-semibold mb-2">{website}</h3>
            <div className="space-y-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-4 bg-modern-card shadow-card rounded-lg"
                >
                  <h4 className="text-lg font-semibold mb-2">Listing #{index + 1}</h4>
                  <p><strong>Title:</strong> {listing.title || "N/A"}</p>
                  <p><strong>Category:</strong> {listing.category || "N/A"}</p>
                  <p><strong>Website:</strong> {listing.website}</p>
                  <p><strong>Listing ID:</strong> {listing.id}</p>
                  <p>
                    <strong>Frames:</strong>{" "}
                    {Object.keys(listing.selected_frames).join(", ") || "None"}
                  </p>
                  <div className="mt-2">
                    <strong>Ad Frames:</strong>{" "}
                    {Object.entries(listing.selected_frames).map(([key, frame]) => (
                      <span
                        key={key}
                        className="inline-block bg-gray-100 text-black px-2 py-1 rounded mr-2"
                      >
                        {frame.size} - ${frame.pricePerClick || "N/A"} per click
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => handleModifyListing(listing.id)}
                      className="bg-modern-primary text-white px-4 py-2 rounded-lg shadow-md hover:bg-modern-primary-dark transition"
                    >
                      Modify Listing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p>No websites found.</p>
      )}
      <h2 className="text-2xl font-bold mb-4 mt-6">Pending Campaigns</h2>
      {console.log("Rendering Pending Campaigns:", pendingCampaigns.map(campaign => ({ id: campaign.campaign_id, status: campaign.status, isActive: campaign.isActive })))}
      {pendingCampaigns.length > 0 ? (
        pendingCampaigns.map((campaign) => (
          <div
            key={campaign.campaign_id}
            className="p-4 bg-modern-card shadow-card rounded-lg mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {campaign.campaigns?.name || "Unknown"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCampaignDecision(campaign.campaign_id, "approved")}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg hover:bg-green-600 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleCampaignDecision(campaign.campaign_id, "rejected")}
                  className="bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 transition"
                >
                  Reject
                </button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
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
                  Termination Date: {campaign.campaigns?.termination_date || "N/A"}
                </p>
              </div>
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
        <p>No pending campaigns.</p>
      )}
      <h2 className="text-2xl font-bold mb-4 mt-6">Live Campaigns</h2>
      {console.log("Rendering Live Campaigns:", liveCampaigns.map(campaign => ({ id: campaign.campaign_id, status: campaign.status, isActive: campaign.isActive })))}
      {liveCampaigns.length > 0 ? (
        liveCampaigns.map((campaign) => (
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
      <h2 className="text-2xl font-bold mb-4 mt-6">Archived Campaigns</h2>
      {console.log("Rendering Archived Campaigns:", archivedCampaigns.map(campaign => ({ id: campaign.campaign_id, status: campaign.status, isActive: campaign.isActive })))}
      {archivedCampaigns.length > 0 ? (
        archivedCampaigns.map((campaign) => (
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
                  className="inline-block w-4 h-4 rounded-full bg-gray-500"
                  title="Archived"
                ></span>
                <button
                  onClick={() => handleRestoreCampaign(campaign.campaign_id)}
                  className="bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600 transition"
                >
                  Restore
                </button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
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
        <p>No archived campaigns found.</p>
      )}
    </div>
  );
}

export default NewPublisherDashboard;
