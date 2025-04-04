import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "./use-toast";

interface Campaign {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  campaign_details: {
    budget?: string;
    dailyLimit?: string;
    endDate?: { year: string; month: string; day: string };
    targetURL?: string;
    creativeImage?: string;
  };
  selected_publishers?: Array<{
    id: string;
    url?: string;
    website?: string;
    frames_purchased?: Array<{
      pricePerClick: string;
      uploadedFile: string;
    }>;
    extra_details?: {
      framesChosen?: { [key: string]: { pricePerClick: string } };
    };
  }>;
  created_at: string;
  is_active: boolean;
  is_archived: boolean;
  uploaded_file?: string;
}

export function useAdvertiserDashboardData() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalClicks: 0,
    avgCostPerClick: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    totalImpressions: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCampaignCount, setTotalCampaignCount] = useState<number>(0);
  const campaignsPerPage = 10;
  const { toast } = useToast();

  const fetchData = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

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
      const advertiserId = profileData?.id;
      if (!advertiserId) throw new Error("Advertiser ID not found");

      const { count, error: countError } = await supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("advertiser_id", advertiserId);
      if (countError) throw new Error(`Count fetch error: ${countError.message}`);
      setTotalCampaignCount(count || 0);

      const start = (pageNum - 1) * campaignsPerPage;
      const end = start + campaignsPerPage - 1;
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, name, campaign_details, selected_publishers, created_at, is_active, is_archived")
        .eq("advertiser_id", advertiserId)
        .range(start, end);
      if (campaignError) throw new Error(`Campaign fetch error: ${campaignError.message}`);

      setHasMore(end < (count || 0) - 1);

      if (!campaignData || campaignData.length === 0) {
        setStats({
          totalCampaigns: 0,
          totalClicks: 0,
          avgCostPerClick: 0,
          totalBudget: 0,
          totalSpent: 0,
          totalRemaining: 0,
          totalImpressions: 0,
        });
        setCampaigns([]);
        setIsLoading(false);
        return;
      }

      // Fetch frames and clicks to calculate budget usage
      const campaignIds = campaignData.map((c) => c.id);
      const { data: framesData, error: framesError } = await supabase
        .from("frames")
        .select("frame_id, campaign_id, price_per_click")
        .in("campaign_id", campaignIds);
      if (framesError) throw new Error(`Frames fetch error: ${framesError.message}`);

      const { data: clicksData, error: clicksError } = await supabase
        .from("clicks")
        .select("frame_id");
      if (clicksError) throw new Error(`Clicks fetch error: ${clicksError.message}`);

      const clicksByFrame = clicksData.reduce((acc, clk) => {
        acc[clk.frame_id] = (acc[clk.frame_id] || 0) + 1;
        return acc;
      }, {});

      // Update is_active in Supabase based on endDate and budget
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Reset time to midnight for comparison

      await Promise.all(
        campaignData.map(async (campaign: Campaign) => {
          const details = campaign.campaign_details || {};
          const budget = details.budget ? parseFloat(details.budget) : 0;

          // Calculate total spent for this campaign
          const frame = framesData.find((f) => f.campaign_id === campaign.id) || {};
          const clicks = clicksByFrame[frame.frame_id] || 0;
          const pricePerClick = parseFloat(frame.price_per_click) || 0;
          const campaignTotalSpent = clicks * pricePerClick;

          const endDate = details.endDate
            ? new Date(
                `${details.endDate.year}-${String(details.endDate.month).padStart(2, "0")}-${String(details.endDate.day).padStart(2, "0")}`
              )
            : null;

          // Calculate if the campaign should be active based on endDate and budget
          const isWithinDateRange = !endDate || endDate > currentDate; // Active if no endDate or endDate is in the future
          const isWithinBudget = campaignTotalSpent < budget;
          const shouldBeActive = isWithinDateRange && isWithinBudget;

          // Log the campaign ID and calculated shouldBeActive value
          console.log(`Campaign ${campaign.id}: shouldBeActive = ${shouldBeActive}`);

          // Update is_active in Supabase if it doesn't match the calculated status
          if (campaign.is_active !== shouldBeActive) {
            const { error: updateError } = await supabase
              .from("campaigns")
              .update({ is_active: shouldBeActive })
              .eq("id", campaign.id);

            if (updateError) {
              console.error(`Error updating is_active for campaign ${campaign.id}:`, updateError);
              console.error("Update error details:", updateError.message, updateError.details, updateError.hint);
              toast({ title: "Error updating campaign status", description: updateError.message });
            }
          }
        })
      );

      // Refetch campaign data to ensure we have the latest is_active values
      const { data: updatedCampaignData, error: updatedCampaignError } = await supabase
        .from("campaigns")
        .select("id, name, campaign_details, selected_publishers, created_at, is_active, is_archived")
        .eq("advertiser_id", advertiserId)
        .range(start, end);
      if (updatedCampaignError) throw new Error(`Updated campaign fetch error: ${updatedCampaignError.message}`);

      const updatedCampaignIds = updatedCampaignData.map((c) => c.id);
      const { data: updatedFramesData, error: updatedFramesError } = await supabase
        .from("frames")
        .select("frame_id, campaign_id, price_per_click, uploaded_file")
        .in("campaign_id", updatedCampaignIds);
      if (updatedFramesError) throw new Error(`Frames fetch error: ${updatedFramesError.message}`);

      const { data: impressionsData, error: impressionsError } = await supabase
        .from("impressions")
        .select("frame_id");
      if (impressionsError) throw new Error(`Impressions fetch error: ${impressionsError.message}`);

      const { data: updatedClicksData, error: updatedClicksError } = await supabase
        .from("clicks")
        .select("frame_id");
      if (updatedClicksError) throw new Error(`Clicks fetch error: ${updatedClicksError.message}`);

      const impressionsByFrame = impressionsData.reduce((acc, imp) => {
        acc[imp.frame_id] = (acc[imp.frame_id] || 0) + 1;
        return acc;
      }, {});
      const updatedClicksByFrame = updatedClicksData.reduce((acc, clk) => {
        acc[clk.frame_id] = (acc[clk.frame_id] || 0) + 1;
        return acc;
      }, {});

      const uniqueCampaigns: Campaign[] = [];
      const seenTitles = new Set();
      updatedCampaignData.forEach((campaign: Campaign) => {
        const title = campaign.name || campaign.id;
        if (!seenTitles.has(title)) {
          seenTitles.add(title);
          uniqueCampaigns.push(campaign);
        }
      });

      const updatedCampaigns = uniqueCampaigns
        .filter((campaign) => !campaign.is_archived)
        .map((campaign: Campaign) => {
          const details = campaign.campaign_details || {};
          const budget = details.budget ? parseFloat(details.budget) : 0;
          const frame = updatedFramesData.find((f) => f.campaign_id === campaign.id) || {};
          const impressions = impressionsByFrame[frame.frame_id] || 0;
          const clicks = updatedClicksByFrame[frame.frame_id] || 0;
          let pricePerClick = parseFloat(frame.price_per_click) || 0;

          if (!pricePerClick && campaign.selected_publishers?.length) {
            const firstPublisher = campaign.selected_publishers[0];
            if (firstPublisher.frames_purchased?.length) {
              pricePerClick = parseFloat(firstPublisher.frames_purchased[0].pricePerClick) || 0;
            } else if (firstPublisher.extra_details?.framesChosen) {
              const firstFrame = Object.values(firstPublisher.extra_details.framesChosen)[0] as { pricePerClick: string };
              pricePerClick = parseFloat(firstFrame.pricePerClick) || 0;
            }
          }

          const campaignTotalSpent = clicks * pricePerClick;
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // Reset time to midnight
          const createdAt = new Date(campaign.created_at);
          const endDate = details.endDate
            ? new Date(
                `${details.endDate.year}-${String(details.endDate.month).padStart(2, "0")}-${String(details.endDate.day).padStart(2, "0")}`
              )
            : null;
          endDate?.setHours(0, 0, 0, 0); // Reset time to midnight
          const isWithinDateRange = createdAt <= currentDate && (!endDate || endDate > currentDate);
          const isWithinBudget = campaignTotalSpent < budget;
          const isActive = campaign.is_active && isWithinDateRange && isWithinBudget;

          return {
            ...campaign,
            impressions,
            clicks,
            selected_publishers: campaign.selected_publishers || [],
            uploaded_file: frame.uploaded_file,
            isActive,
          };
        });

      const totalClicks = updatedCampaigns.reduce((sum, c) => sum + c.clicks, 0);
      const totalImpressions = updatedCampaigns.reduce((sum, c) => sum + c.impressions, 0);
      const totalBudget = updatedCampaigns.reduce((sum, c) => sum + parseFloat(c.campaign_details?.budget || "0"), 0);
      const totalSpent = updatedCampaigns.reduce((sum, c) => {
        const frame = updatedFramesData.find((f) => f.campaign_id === c.id);
        const pricePerClick = parseFloat(frame?.price_per_click) || 0;
        return sum + c.clicks * pricePerClick;
      }, 0);
      const avgCostPerClick = totalClicks > 0 ? totalSpent / totalClicks : 0;
      const totalRemaining = Math.max(0, totalBudget - totalSpent);

      setStats({
        totalCampaigns: count || 0,
        totalClicks,
        avgCostPerClick,
        totalBudget,
        totalSpent,
        totalRemaining,
        totalImpressions,
      });
      setCampaigns((prev) => (reset ? updatedCampaigns : [...prev, ...updatedCampaigns]));
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Error fetching data", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData(page, page === 1);

    const impressionsChannel = supabase
      .channel("public:impressions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "impressions" }, () => fetchData(page, page === 1))
      .subscribe();
    const clicksChannel = supabase
      .channel("public:clicks")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clicks" }, () => fetchData(page, page === 1))
      .subscribe();

    return () => {
      supabase.removeChannel(impressionsChannel);
      supabase.removeChannel(clicksChannel);
    };
  }, [page, fetchData]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  const refetch = () => {
    setPage(1);
    fetchData(1, true);
  };

  return { campaigns, stats, isLoading, error, loadMore, hasMore, totalCampaignCount, refetch };
}