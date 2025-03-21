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
  campaigns: { name: string; termination_date?: string; creativeImage?: string } | null;
}

export function usePublisherDashboardData() {
  const [websites, setWebsites] = useState<{ [key: string]: Listing[] }>({});
  const [campaignStats, setCampaignStats] = useState<CampaignStat[]>([]);
  const [totalImpressions, setTotalImpressions] = useState<number>(0);
  const [totalClicks, setTotalClicks] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch user and publisher ID
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

        // Fetch listings
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

        // Fetch ad_stats
        const { data: statsData, error: statsError } = await supabase
          .from("ad_stats")
          .select("listing_id, frame, impression_count, click_count, campaign_id")
          .in("listing_id", listingIds);
        if (statsError) throw new Error(`Stats fetch error: ${statsError.message}`);

        // Fetch campaigns
        const { data: campaignsData, error: campaignsError } = await supabase
          .from("campaigns")
          .select("id, name, campaign_details");
        if (campaignsError) throw new Error(`Campaigns fetch error: ${campaignsError.message}`);

        // Aggregate stats by frame
        const aggregatedStats: { [key: string]: CampaignStat } = {};
        statsData.forEach((stat: any) => {
          const key = `${stat.listing_id}-${stat.frame}`;
          if (!aggregatedStats[key]) {
            aggregatedStats[key] = { ...stat, impression_count: 0, click_count: 0 };
          }
          aggregatedStats[key].impression_count += stat.impression_count || 0;
          aggregatedStats[key].click_count += stat.click_count || 0;
          if (stat.campaign_id !== "unknown") {
            aggregatedStats[key].campaign_id = stat.campaign_id;
          }
        });

        const statsWithCampaigns = Object.values(aggregatedStats).map((stat: any) => {
          const campaign = campaignsData?.find((c: any) => c.id === stat.campaign_id);
          const endDate = campaign?.campaign_details?.endDate;
          const terminationDate = endDate ? `${endDate.year}-${endDate.month}-${endDate.day}` : null;
          return {
            ...stat,
            campaigns: campaign
              ? {
                  name: campaign.name,
                  termination_date: terminationDate,
                  creativeImage: campaign.campaign_details?.creativeImage || null,
                }
              : null,
          };
        });
        setCampaignStats(statsWithCampaigns);

        // Calculate totals
        const impressions = statsWithCampaigns.reduce((sum: number, stat: CampaignStat) => sum + (stat.impression_count || 0), 0);
        const clicks = statsWithCampaigns.reduce((sum: number, stat: CampaignStat) => sum + (stat.click_count || 0), 0);
        let earnings = 0;

        parsedListings.forEach((listing: Listing) => {
          const frames = listing.selected_frames || {};
          statsWithCampaigns
            .filter((stat: CampaignStat) => stat.listing_id === listing.id)
            .forEach((stat: CampaignStat) => {
              const frameData = frames[stat.frame];
              if (frameData) {
                const ppc = parseFloat(frameData.pricePerClick || "0");
                earnings += (stat.click_count || 0) * ppc;
              }
            });
        });

        setTotalImpressions(impressions);
        setTotalClicks(clicks);
        setTotalEarnings(earnings);
      } catch (err: any) {
        setError(err.message);
        toast({ title: "Error fetching data", description: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  return { websites, campaignStats, totalImpressions, totalClicks, totalEarnings, isLoading, error };
}
