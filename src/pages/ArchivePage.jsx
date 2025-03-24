import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/use-toast";

function ArchivePage({ session }) {
  const [archivedCampaigns, setArchivedCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchArchivedCampaigns() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        const user = userData?.user;
        if (!user) throw new Error("No user is logged in");

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .single();
        if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);
        const userId = profileData?.id;
        const userRole = profileData?.role;
        if (!userId) throw new Error("User ID not found");

        let query = supabase
          .from("campaigns")
          .select("*")
          .eq("is_archived", true);

        if (userRole === "advertiser") {
          query = query.eq("advertiser_id", userId);
        } else if (userRole === "publisher") {
          const { data: listingsData, error: listingsError } = await supabase
            .from("listings")
            .select("id")
            .eq("publisher_id", userId);
          if (listingsError) throw new Error(`Listings fetch error: ${listingsError.message}`);
          const listingIds = listingsData.map(listing => listing.id);

          const { data: framesData, error: framesError } = await supabase
            .from("frames")
            .select("campaign_id")
            .in("listing_id", listingIds);
          if (framesError) throw new Error(`Frames fetch error: ${framesError.message}`);
          const campaignIds = framesData.map(frame => frame.campaign_id);

          query = query.in("id", campaignIds);
        } else {
          throw new Error("Invalid user role");
        }

        const { data: campaignData, error: campaignError } = await query;
        if (campaignError) throw new Error(`Campaign fetch error: ${campaignError.message}`);

        setArchivedCampaigns(campaignData || []);
      } catch (err) {
        setError(err.message);
        toast({ title: "Error fetching archived campaigns", description: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    fetchArchivedCampaigns();
  }, [toast]);

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm("Are you sure you want to permanently delete this campaign? This action cannot be undone.")) {
      return;
    }

    try {
      const { error: framesError } = await supabase
        .from("frames")
        .delete()
        .eq("campaign_id", campaignId);
      if (framesError) throw new Error(`Error deleting frames: ${framesError.message}`);

      const { error: campaignError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);
      if (campaignError) throw new Error(`Error deleting campaign: ${campaignError.message}`);

      setArchivedCampaigns(archivedCampaigns.filter(campaign => campaign.id !== campaignId));
      toast({ title: "Success", description: "Campaign deleted successfully." });
    } catch (err) {
      toast({ title: "Error", description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
        <h1 className="text-3xl font-bold mb-6">Archived Campaigns</h1>
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
      <h1 className="text-3xl font-bold mb-6">Archived Campaigns</h1>

      {error && (
        <div className="mb-6 text-red-500">
          {error}
        </div>
      )}

      {archivedCampaigns.length === 0 ? (
        <p>No archived campaigns found.</p>
      ) : (
        <div className="space-y-6">
          {archivedCampaigns.map((campaign) => {
            const details = campaign.campaign_details || {};
            const campaignName = campaign.name || "Untitled Campaign";
            const endDate = details.endDate
              ? `${details.endDate.year}/${details.endDate.month}/${details.endDate.day}`
              : "N/A";
            const impressions = campaign.impressions || 0;
            const clicks = campaign.clicks || 0;

            return (
              <div key={campaign.id} className="p-6 bg-modern-card shadow-card rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">{campaignName}</h3>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
                <div className="space-y-2">
                  <p>Campaign ID: {campaign.id}</p>
                  <p className="text-gray-700">Ended: {endDate}</p>
                  <p className="text-gray-700">Total Impressions: {impressions}</p>
                  <p className="text-gray-700">Total Clicks: {clicks}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ArchivePage;