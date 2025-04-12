import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePublisherDashboardData, Listing, CampaignStat, Websites } from "../hooks/usePublisherDashboardData";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/use-toast";

// Define type for session prop
interface Session {
  user: {
    id: string;
    email: string;
  };
}

interface NewPublisherDashboardProps {
  session: Session;
}

function NewPublisherDashboard({ session }: NewPublisherDashboardProps) {
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
  const navigate = useNavigate();

  const liveCampaigns = campaignStats.filter(campaign => campaign.status !== "archived");
  const archivedCampaigns = campaignStats.filter(campaign => campaign.status === "archived");

  // State for price editing
  const [editingFrame, setEditingFrame] = useState<{ listingId: string; frameId: string } | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [pricingModel, setPricingModel] = useState<"CPC" | "CPM">("CPC");

  // Calculate average CPM or CPC based on the pricing model
  const averagePricing = liveCampaigns.reduce(
    (acc, campaign) => {
      const pricingModel = campaign.pricingModel || "CPC";
      if (pricingModel === "CPC") {
        acc.cpcSum += parseFloat(campaign.pricePerClick || "0") || 0;
        acc.cpcCount += 1;
      } else {
        acc.cpmSum += parseFloat(campaign.cpm || "0") || 0;
        acc.cpmCount += 1;
      }
      return acc;
    },
    { cpcSum: 0, cpcCount: 0, cpmSum: 0, cpmCount: 0 }
  );

  const averageCPC = averagePricing.cpcCount > 0 ? averagePricing.cpcSum / averagePricing.cpcCount : 0;
  const averageCPM = averagePricing.cpmCount > 0 ? averagePricing.cpmSum / averagePricing.cpmCount : 0;

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

  const handleModifyListing = (listing: Listing) => {
    if (!listing?.id) {
      toast({ title: "Error", description: "Invalid listing ID" });
      return;
    }
    console.log("Redirecting to /edit-listing/", listing.id);
    navigate(`/edit-listing/${listing.id}`);
  };

  const handleEditPrice = (listingId: string, frameId: string, currentPricingModel: string, currentPrice: string) => {
    setEditingFrame({ listingId, frameId });
    setPricingModel(currentPricingModel as "CPC" | "CPM");
    setNewPrice(currentPrice);
  };

  const handleUpdatePrice = async (listingId: string, frameId: string) => {
    try {
      // Update the price in the frames table
      const updateData: { price_per_click?: string; cpm?: string } = {};
      if (pricingModel === "CPC") {
        updateData.price_per_click = newPrice;
        updateData.cpm = "0.00"; // Reset CPM if switching to CPC
      } else {
        updateData.cpm = newPrice;
        updateData.price_per_click = "0.00"; // Reset CPC if switching to CPM
      }

      const { error: frameError } = await supabase
        .from("frames")
        .update({
          pricing_model: pricingModel,
          ...updateData,
        })
        .eq("listing_id", listingId)
        .eq("frame_id", frameId);

      if (frameError) {
        console.error("Error updating frame price:", frameError);
        throw frameError;
      }

      // Update the selected_frames in the listings table
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("selected_frames")
        .eq("id", listingId)
        .single();

      if (listingError) {
        console.error("Error fetching listing for price update:", listingError);
        throw listingError;
      }

      let selectedFrames = listingData.selected_frames;
      if (typeof selectedFrames === "string") {
        selectedFrames = JSON.parse(selectedFrames);
      }

      if (selectedFrames[frameId]) {
        selectedFrames[frameId] = {
          ...selectedFrames[frameId],
          pricingModel,
          pricePerClick: pricingModel === "CPC" ? newPrice : "0.00",
          cpm: pricingModel === "CPM" ? newPrice : "0.00",
        };

        const { error: updateListingError } = await supabase
          .from("listings")
          .update({ selected_frames: selectedFrames })
          .eq("id", listingId);

        if (updateListingError) {
          console.error("Error updating listing with new price:", updateListingError);
          throw updateListingError;
        }
      }

      toast({ title: "Success", description: "Price updated successfully." });
      setEditingFrame(null);
      setNewPrice("");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Error updating price:", err);
      toast({ title: "Error", description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
        <h1 className="text-3xl font-bold mb-6">Publisher Dashboard (Loading...)</h1>
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

  console.log("Rendered Campaign Stats:", campaignStats.map(c => ({
    id: c.campaign_id,
    status: c.status,
    isActive: c.isActive,
    listing: c.listing_id,
    frame: c.frame,
    frameLabel: c.frameLabel,
  })));

  return (
    <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
      <h1 className="text-3xl font-bold mb-6">Publisher Dashboard</h1>
      {error && (
        <div className="mb-6 text-red-500">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {[
          { title: "Total Campaigns", value: liveCampaigns.length },
          { title: "Total Impressions", value: totalImpressions },
          { title: "Total Clicks", value: totalClicks },
          { title: "Total Earnings", value: `$${totalEarnings.toFixed(2)}` },
          { title: "Avg. CPC", value: `$${averageCPC.toFixed(2)}` },
          { title: "Avg. CPM", value: `$${averageCPM.toFixed(2)}` },
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
              {listings.map((listing) => {
                console.log("Navigating to URL for listing:", listing.id, `/edit-listing/${listing.id}`);
                // Generate simple frame identifiers (Frame-1, Frame-2, etc.)
                const frameEntries = Object.entries(listing.selected_frames);
                const frameLabels = frameEntries.map((_, idx) => `Frame-${idx + 1}`);
                return (
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
                      {frameLabels.join(", ") || "None"}
                    </p>
                    <div className="mt-2">
                      <strong>Ad Frames:</strong>{" "}
                      {frameEntries.map(([key, frame], idx) => {
                        const pricingModel = frame.pricingModel || "CPC";
                        const price = pricingModel === "CPC" 
                          ? frame.pricePerClick || "N/A"
                          : frame.cpm || "N/A";
                        const frameLabel = `Frame-${idx + 1}`;
                        return (
                          <div key={key} className="inline-block bg-gray-100 text-black px-2 py-1 rounded mr-2 mb-2">
                            {frameLabel}: {frame.size} - {pricingModel}: ${price} {pricingModel === "CPC" ? "per click" : "CPM"}
                            <button
                              onClick={() => handleEditPrice(listing.id, key, pricingModel, price)}
                              className="ml-2 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition"
                            >
                              Edit Price
                            </button>
                            {editingFrame?.listingId === listing.id && editingFrame?.frameId === key && (
                              <div className="inline-block ml-2">
                                <select
                                  value={pricingModel}
                                  onChange={(e) => setPricingModel(e.target.value as "CPC" | "CPM")}
                                  className="border p-1 rounded mr-2"
                                >
                                  <option value="CPC">CPC</option>
                                  <option value="CPM">CPM</option>
                                </select>
                                <input
                                  type="number"
                                  value={newPrice}
                                  onChange={(e) => setNewPrice(e.target.value)}
                                  placeholder="New Price"
                                  className="border p-1 rounded mr-2"
                                  step="0.01"
                                  min="0"
                                />
                                <button
                                  onClick={() => handleUpdatePrice(listing.id, key)}
                                  className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingFrame(null)}
                                  className="ml-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4">
                      <Link
                        to={`/edit-listing/${listing.id}`}
                        className="bg-modern-primary text-white px-4 py-2 rounded-lg shadow-md hover:bg-modern-primary-dark transition"
                        onClick={() => console.log("Clicked Modify Listing for ID:", listing.id)}
                      >
                        Modify Listing
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p>No websites found.</p>
      )}
      <h2 className="text-2xl font-bold mb-4 mt-6">Pending Campaigns</h2>
      {pendingCampaigns.length > 0 ? (
        pendingCampaigns.map((campaign) => {
          console.log("Rendering Pending Campaigns:", pendingCampaigns.map(campaign => ({ id: campaign.campaign_id, status: campaign.status, isActive: campaign.isActive })));
          const pricingModel = campaign.pricingModel || "CPC";
          const price = pricingModel === "CPC" 
            ? `$${parseFloat(campaign.pricePerClick || "0").toFixed(2)} per click`
            : `$${parseFloat(campaign.cpm || "0").toFixed(2)} CPM`;
          return (
            <div
              key={`${campaign.campaign_id}-${campaign.frame}`}
              className="p-4 bg-modern-card shadow-card rounded-lg mb-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {campaign.campaigns?.name ?? campaign.frameLabel ?? "Untitled Campaign"}
                </h3>
                <div className="flex items-center gap-2">
                  <form className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCampaignDecision(campaign.campaign_id, "approved")}
                      className="bg-green-500 text-white px-4 py-1 rounded-lg hover:bg-green-600 transition"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCampaignDecision(campaign.campaign_id, "rejected")}
                      className="bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 transition"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">
                    Campaign Title: {campaign.campaigns?.name ?? campaign.frameLabel ?? "Untitled Campaign"}
                  </p>
                  <p className="text-sm">
                    Frame: {campaign.frameLabel || "Unknown"}
                  </p>
                  <p className="text-sm">
                    Pricing Model: {pricingModel}
                  </p>
                  <p className="text-sm">
                    Price: {price}
                  </p>
                  <p className="text-sm">
                    Termination Date: {campaign.campaigns?.termination_date || "N/A"}
                  </p>
                </div>
                <div className="w-full md:w-24 flex-shrink-0">
                  {campaign.campaigns && campaign.campaigns.creativeImage ? (
                    <img
                      src={campaign.campaigns.creativeImage}
                      alt="Ad Creative"
                      className="w-full h-24 object-cover rounded-lg cursor-pointer"
                      onClick={() => {
                        if (campaign.campaigns && campaign.campaigns.creativeImage) {
                          window.open(campaign.campaigns.creativeImage, "_blank");
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 flex items-center justify-center rounded-lg">
                      <p className="text-sm text-gray-500">No Image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p>No pending campaigns.</p>
      )}
      <h2 className="text-2xl font-bold mb-4 mt-6">Live Campaigns</h2>
      {Array.isArray(liveCampaigns) && liveCampaigns.length > 0 ? (
        liveCampaigns.map((campaign) => {
          console.log("Rendering Live Campaigns:", liveCampaigns.map(campaign => ({ id: campaign.campaign_id, status: campaign.status, isActive: campaign.isActive })));
          const pricingModel = campaign.pricingModel || "CPC";
          const price = pricingModel === "CPC" 
            ? `$${parseFloat(campaign.pricePerClick || "0").toFixed(2)} per click`
            : `$${parseFloat(campaign.cpm || "0").toFixed(2)} CPM`;
          return (
            <div
              key={campaign.campaign_id}
              className="p-4 bg-modern-card shadow-card rounded-lg mb-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {campaign.campaigns?.name ?? campaign.frameLabel ?? "Untitled Campaign"}
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
                    Campaign Title: {campaign.campaigns?.name ?? campaign.frameLabel ?? "Untitled Campaign"}
                  </p>
                  <p className="text-sm">
                    Frame: {campaign.frameLabel || "Unknown"}
                  </p>
                  <p className="text-sm">
                    Pricing Model: {pricingModel}
                  </p>
                  <p className="text-sm">
                    Price: {price}
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
                  {campaign.campaigns && campaign.campaigns.creativeImage ? (
                    <img
                      src={campaign.campaigns.creativeImage}
                      alt="Ad Creative"
                      className="w-full h-24 object-cover rounded-lg cursor-pointer"
                      onClick={() => {
                        if (campaign.campaigns && campaign.campaigns.creativeImage) {
                          window.open(campaign.campaigns.creativeImage, "_blank");
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 flex items-center justify-center rounded-lg">
                      <p className="text-sm text-gray-500">No Image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p>No active campaigns found.</p>
      )}
      <h2 className="text-2xl font-bold mb-4 mt-6">Archived Campaigns</h2>
      {Array.isArray(archivedCampaigns) && archivedCampaigns.length > 0 ? (
        archivedCampaigns.map((campaign) => {
          console.log("Rendering Archived Campaigns:", archivedCampaigns.map(campaign => ({ id: campaign.campaign_id, status: campaign.status, isActive: campaign.isActive })));
          const pricingModel = campaign.pricingModel || "CPC";
          const price = pricingModel === "CPC" 
            ? `$${parseFloat(campaign.pricePerClick || "0").toFixed(2)} per click`
            : `$${parseFloat(campaign.cpm || "0").toFixed(2)} CPM`;
          return (
            <div
              key={campaign.campaign_id}
              className="p-4 bg-modern-card shadow-card rounded-lg mb-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {campaign.campaigns?.name ?? campaign.frameLabel ?? "Untitled Campaign"}
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-full bg-gray-500"
                    title="Archived"
                    aria-label="Archived status indicator"
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
                    Campaign Title: {campaign.campaigns?.name ?? campaign.frameLabel ?? "Untitled Campaign"}
                  </p>
                  <p className="text-sm">
                    Frame: {campaign.frameLabel || "Unknown"}
                  </p>
                  <p className="text-sm">
                    Pricing Model: {pricingModel}
                  </p>
                  <p className="text-sm">
                    Price: {price}
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
                  {campaign.campaigns && campaign.campaigns.creativeImage ? (
                    <img
                      src={campaign.campaigns.creativeImage}
                      alt="Ad Creative"
                      className="w-full h-24 object-cover rounded-lg cursor-pointer"
                      onClick={() => {
                        if (campaign.campaigns && campaign.campaigns.creativeImage) {
                          window.open(campaign.campaigns.creativeImage, "_blank");
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 flex items-center justify-center rounded-lg">
                      <p className="text-sm text-gray-500">No Image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p>No archived campaigns found.</p>
      )}
    </div>
  );
}

export default NewPublisherDashboard;