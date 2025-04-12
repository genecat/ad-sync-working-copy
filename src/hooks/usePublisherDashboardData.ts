import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/use-toast";

// Define types for the data
export interface FrameData {
  size: string;
  pricingModel: string;
  pricePerClick: string;
  cpm: string;
}

export interface Listing {
  id: string;
  title: string;
  category: string;
  website: string;
  selected_frames: { [key: string]: FrameData };
}

export interface Websites {
  [website: string]: Listing[];
}

export interface CampaignStat {
  campaign_id: string;
  listing_id: string;
  frame: string;
  frameLabel: string; // Add frameLabel for user-friendly display
  status: string;
  isActive: boolean;
  impression_count: number;
  click_count: number;
  pricingModel: string;
  pricePerClick: string;
  cpm: string;
  campaigns: {
    name: string;
    termination_date: string;
    creativeImage: string;
    budget?: string;
  };
}

export function usePublisherDashboardData() {
  const [websites, setWebsites] = useState<Websites>({});
  const [campaignStats, setCampaignStats] = useState<CampaignStat[]>([]);
  const [pendingCampaigns, setPendingCampaigns] = useState<CampaignStat[]>([]);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch the current user
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

      // Fetch listings for the publisher
      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .eq("publisher_id", publisherId);

      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
        throw new Error("Failed to fetch listings");
      }

      const listingsWithFrames = await Promise.all(
        listingsData.map(async (listing) => {
          const { data: framesData, error: framesError } = await supabase
            .from("frames")
            .select("frame_id, pricing_model, price_per_click, cpm")
            .eq("listing_id", listing.id);

          if (framesError) {
            console.error("Error fetching frames for listing:", listing.id, framesError);
            throw new Error("Failed to fetch frames");
          }

          let selectedFrames = listing.selected_frames;
          if (typeof selectedFrames === "string") {
            try {
              selectedFrames = JSON.parse(selectedFrames);
            } catch (parseErr) {
              console.error("Error parsing selected_frames for listing", listing.id, parseErr);
              selectedFrames = {};
            }
          }

          // Merge pricing data into selected_frames
          const updatedFrames: { [key: string]: FrameData } = {};
          for (const frame of framesData) {
            if (selectedFrames[frame.frame_id]) {
              updatedFrames[frame.frame_id] = {
                ...selectedFrames[frame.frame_id],
                pricingModel: frame.pricing_model || "CPC",
                pricePerClick: frame.price_per_click?.toString() || "0.00",
                cpm: frame.cpm?.toString() || "0.00",
              };
            }
          }

          return { ...listing, selected_frames: updatedFrames };
        })
      );

      const groupedWebsites: Websites = listingsWithFrames.reduce((acc: Websites, listing: Listing) => {
        const website = listing.website || "Unknown Website";
        if (!acc[website]) {
          acc[website] = [];
        }
        acc[website].push(listing);
        return acc;
      }, {});

      setWebsites(groupedWebsites);

      const listingIds = listingsWithFrames.map((l: Listing) => l.id);

      // Create a mapping of frame_id to user-friendly labels for each listing
      const frameLabelMap: { [listingId: string]: { [frameId: string]: string } } = {};
      listingsWithFrames.forEach((listing) => {
        const frameEntries = Object.entries(listing.selected_frames);
        frameLabelMap[listing.id] = {};
        frameEntries.forEach(([frameId], idx) => {
          frameLabelMap[listing.id][frameId] = `Frame-${idx + 1}`;
        });
      });

      // Fetch frames data
      const { data: framesData, error: framesError } = await supabase
        .from("frames")
        .select(`
          campaign_id,
          listing_id,
          frame_id,
          pricing_model,
          price_per_click,
          cpm,
          campaigns (
            id,
            name,
            status,
            campaign_details,
            is_active,
            is_archived,
            selected_publishers
          )
        `)
        .in("listing_id", listingIds);

      if (framesError) {
        console.error("Error fetching frames:", framesError);
        throw new Error("Failed to fetch frames");
      }

      // Fetch impressions data separately
      const { data: impressionsData, error: impressionsError } = await supabase
        .from("impressions")
        .select("frame_id");

      if (impressionsError) {
        console.error("Error fetching impressions:", impressionsError);
        throw new Error("Failed to fetch impressions");
      }

      // Fetch clicks data separately
      const { data: clicksData, error: clicksError } = await supabase
        .from("clicks")
        .select("frame_id");

      if (clicksError) {
        console.error("Error fetching clicks:", clicksError);
        throw new Error("Failed to fetch clicks");
      }

      // Aggregate impressions and clicks by frame_id
      const impressionsByFrame = impressionsData.reduce((acc: { [key: string]: number }, imp: { frame_id: string }) => {
        acc[imp.frame_id] = (acc[imp.frame_id] || 0) + 1;
        return acc;
      }, {});

      const clicksByFrame = clicksData.reduce((acc: { [key: string]: number }, clk: { frame_id: string }) => {
        acc[clk.frame_id] = (acc[clk.frame_id] || 0) + 1;
        return acc;
      }, {});

      let totalImps = 0;
      let totalClks = 0;
      let totalEarn = 0;

      const stats: CampaignStat[] = framesData.map((frame: any) => {
        const campaign = frame.campaigns;
        const impressionCount = impressionsByFrame[frame.frame_id] || 0;
        const clickCount = clicksByFrame[frame.frame_id] || 0;

        totalImps += impressionCount;
        totalClks += clickCount;

        const pricingModel = frame.pricing_model || "CPC";
        const pricePerClick = parseFloat(frame.price_per_click) || 0;
        const cpm = parseFloat(frame.cpm) || 0;
        const earnings = pricingModel === "CPC" 
          ? clickCount * pricePerClick 
          : (impressionCount / 1000) * cpm;

        totalEarn += earnings;

        const endDate = campaign?.campaign_details?.endDate;
        const budget = campaign?.campaign_details?.budget ? parseFloat(campaign.campaign_details.budget) : 0;
        const totalSpent = pricingModel === "CPC" 
          ? clickCount * pricePerClick 
          : (impressionCount / 1000) * cpm;

        let isActive = campaign?.is_active || false;
        if (endDate) {
          const end = new Date(endDate.year, endDate.month - 1, endDate.day);
          const today = new Date();
          const isWithinDateRange = end >= today;
          const isWithinBudget = totalSpent < budget;
          isActive = isWithinDateRange && isWithinBudget;
        }

        // Get the user-friendly frame label
        const frameLabel = frameLabelMap[frame.listing_id]?.[frame.frame_id] || "Unknown Frame";

        return {
          campaign_id: frame.campaign_id,
          listing_id: frame.listing_id,
          frame: frame.frame_id,
          frameLabel, // Add the user-friendly label
          status: campaign?.status || "unknown",
          isActive: isActive,
          impression_count: impressionCount,
          click_count: clickCount,
          pricingModel: pricingModel,
          pricePerClick: frame.price_per_click?.toString() || "0.00",
          cpm: frame.cpm?.toString() || "0.00",
          campaigns: {
            name: campaign?.name || "Untitled Campaign",
            termination_date: endDate
              ? `${endDate.year}-${endDate.month}-${endDate.day}`
              : "N/A",
            creativeImage: campaign?.selected_publishers?.[0]?.frames_purchased?.[0]?.uploadedFile || "",
            budget: campaign?.campaign_details?.budget,
          },
        };
      });

      const approvedCampaigns = stats.filter(stat => stat.status === "approved");
      setCampaignStats(stats);
      setPendingCampaigns(stats.filter((stat) => stat.status === "pending"));
      setTotalImpressions(totalImps);
      setTotalClicks(totalClks);
      setTotalEarnings(totalEarn);

    } catch (err: any) {
      console.error("Error in usePublisherDashboardData:", err);
      setError(err.message || "An unexpected error occurred");
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

  return {
    websites,
    campaignStats,
    pendingCampaigns,
    totalImpressions,
    totalClicks,
    totalEarnings,
    isLoading,
    error,
  };
}