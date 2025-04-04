import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/use-toast";

interface FrameData {
  size: string;
  pricePerClick: string;
}

interface Listing {
  id: string;
  website: string;
  selected_frames: { [key: string]: FrameData };
}

interface CampaignStat {
  listing_id: string;
  frame: string;
  impression_count: number;
  click_count: number;
  campaign_id: string;
  uploaded_file?: string;
  pricePerClick?: number;
  isActive: boolean;
  status: string;
  campaigns: { name: string; termination_date?: string; creativeImage?: string; budget?: string } | null;
}

export function usePublisherDashboardData() {
  const [websites, setWebsites] = useState<{ [key: string]: Listing[] }>({});
  const [campaignStats, setCampaignStats] = useState<CampaignStat[]>([]);
  const [pendingCampaigns, setPendingCampaigns] = useState<CampaignStat[]>([]);
  const [totalImpressions, setTotalImpressions] = useState<number>(0);
  const [totalClicks, setTotalClicks] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(`User fetch error: ${userError.message}`);
      const user = userData?.user;
      if (!user) throw new Error("No user is logged in");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);
      const publisherId = profileData?.id;
      if (!publisherId) throw new Error("Publisher ID not found");

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("id, website, selected_frames")
        .eq("publisher_id", publisherId);
      if (listingError) throw new Error(`Listings fetch error: ${listingError.message}`);
      if (!listingData || listingData.length === 0) {
        throw new Error(`No listings found for publisher_id: ${publisherId}`);
      }

      const parsedListings = listingData.map((listing: any) => ({
        ...listing,
        selected_frames:
          typeof listing.selected_frames === "string"
            ? JSON.parse(listing.selected_frames)
            : listing.selected_frames,
      }));

      const groupedByWebsite = parsedListings.reduce((acc: { [key: string]: Listing[] }, listing: Listing) => {
        const website = listing.website || "No Website Listed";
        if (!acc[website]) acc[website] = [];
        acc[website].push(listing);
        return acc;
      }, {});
      setWebsites(groupedByWebsite);

      const listingIds = parsedListings.map((l: Listing) => l.id);

      const { data: frameData, error: frameError } = await supabase
        .from("frames")
        .select("listing_id, frame_id, campaign_id, uploaded_file, price_per_click, campaigns (id, name, campaign_details, is_active, is_archived, status)")
        .in("listing_id", listingIds);
      if (frameError) throw new Error(`Frame fetch error: ${frameError.message}`);

      const { data: impressionsData, error: impressionsError } = await supabase
        .from("impressions")
        .select("frame_id");
      if (impressionsError) throw new Error(`Impressions fetch error: ${impressionsError.message}`);

      const { data: clicksData, error: clicksError } = await supabase
        .from("clicks")
        .select("frame_id");
      if (clicksError) throw new Error(`Clicks fetch error: ${clicksError.message}`);

      const impressionsByFrame = impressionsData.reduce((acc, imp) => {
        acc[imp.frame_id] = (acc[imp.frame_id] || 0) + 1;
        return acc;
      }, {});
      const clicksByFrame = clicksData.reduce((acc, clk) => {
        acc[clk.frame_id] = (acc[clk.frame_id] || 0) + 1;
        return acc;
      }, {});

      const stats: CampaignStat[] = frameData.map((frame: any) => {
        const campaign = frame.campaigns;
        const impressionCount = impressionsByFrame[frame.frame_id] || 0;
        const clickCount = clicksByFrame[frame.frame_id] || 0;
        const pricePerClick = parseFloat(frame.price_per_click) || 0;
        const endDate = campaign?.campaign_details?.endDate;
        const budget = campaign?.campaign_details?.budget ? parseFloat(campaign.campaign_details.budget) : 0;
        const totalSpent = clickCount * pricePerClick;

        let isActive = campaign?.is_active || false;
        if (endDate) {
          const end = new Date(endDate.year, endDate.month - 1, endDate.day);
          const today = new Date();
          const isWithinDateRange = end >= today;
          const isWithinBudget = totalSpent < budget;
          isActive = isWithinDateRange && isWithinBudget;
        }

        const stat = {
          listing_id: frame.listing_id,
          frame: frame.frame_id,
          campaign_id: frame.campaign_id,
          impression_count: impressionCount,
          click_count: clickCount,
          uploaded_file: frame.uploaded_file,
          pricePerClick,
          isActive,
          status: campaign?.status || "pending",
          campaigns: {
            name: campaign?.name || "Unknown",
            termination_date: endDate
              ? `${endDate.year}-${endDate.month}-${endDate.day}`
              : undefined,
            creativeImage: campaign?.campaign_details?.creativeImage || null,
            budget: campaign?.campaign_details?.budget,
          },
        };
        console.log(`Campaign ${stat.campaign_id}: status=${stat.status}, isActive=${stat.isActive}`);
        return stat;
      });

      const approvedCampaigns = stats.filter(stat => stat.status === "approved");
      console.log("Approved Campaigns:", approvedCampaigns.map(stat => ({ id: stat.campaign_id, status: stat.status, isActive: stat.isActive })));
      const pendingCampaigns = stats.filter(stat => stat.status === "pending");
      console.log("Pending Campaigns:", pendingCampaigns.map(stat => ({ id: stat.campaign_id, status: stat.status, isActive: stat.isActive })));

      setCampaignStats(stats); // Include all campaigns (approved, pending, and archived)
      setPendingCampaigns(pendingCampaigns);

      const totalImps = approvedCampaigns.reduce((sum, stat) => sum + stat.impression_count, 0);
      const totalClks = approvedCampaigns.reduce((sum, stat) => sum + stat.click_count, 0);
      const totalEarn = approvedCampaigns.reduce((sum, stat) => sum + (stat.click_count * (stat.pricePerClick || 0) * 0.7), 0);

      setTotalImpressions(totalImps);
      setTotalClicks(totalClks);
      setTotalEarnings(totalEarn);
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Error fetching data", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const impressionsChannel = supabase
      .channel("public:impressions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "impressions" }, fetchData)
      .subscribe();
    const clicksChannel = supabase
      .channel("public:clicks")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clicks" }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(impressionsChannel);
      supabase.removeChannel(clicksChannel);
    };
  }, [toast]);

  return { websites, campaignStats, pendingCampaigns, totalImpressions, totalClicks, totalEarnings, isLoading, error };
}