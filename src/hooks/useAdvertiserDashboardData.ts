import { useState, useEffect } from "react";
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
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user and advertiser ID
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

        // Fetch campaigns
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select("id, name, impressions, clicks, campaign_details, selected_publishers, created_at, is_active, is_archived")
          .eq("advertiser_id", advertiserId);
        if (campaignError) throw new Error(`Campaign fetch error: ${campaignError.message}`);

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

        // Remove duplicates based on campaign name
        const uniqueCampaigns: Campaign[] = [];
        const seenTitles = new Set();
        campaignData.forEach((campaign: Campaign) => {
          const title = campaign.name || campaign.id;
          if (!seenTitles.has(title)) {
            seenTitles.add(title);
            uniqueCampaigns.push(campaign);
          }
        });

        // Fetch uploaded_file from frames table
        const listingIds = uniqueCampaigns.flatMap(campaign =>
          (campaign.selected_publishers || []).map(publisher => publisher.id).filter(Boolean)
        );

        let uploadedFilesMap: { [key: string]: string } = {};
        if (listingIds.length > 0) {
          const { data: framesData, error: framesError } = await supabase
            .from("frames")
            .select("listing_id, uploaded_file")
            .in("listing_id", listingIds);
          if (framesError) throw new Error(`Frames fetch error: ${framesError.message}`);

          uploadedFilesMap = framesData.reduce((acc: { [key: string]: string }, frame: any) => {
            if (frame.uploaded_file) {
              acc[frame.listing_id] = frame.uploaded_file;
            }
            return acc;
          }, {});
        }

        // Calculate stats
        let totalClicks = 0;
        let totalSpent = 0;
        let totalBudget = 0;
        let totalImpressions = 0;

        const updatedCampaigns = uniqueCampaigns
          .filter(campaign => !campaign.is_archived) // Filter out archived campaigns
          .map((campaign: Campaign) => {
            const details = campaign.campaign_details || {};
            const budget = details.budget ? parseFloat(details.budget) : 0;
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

            const currentDate = new Date();
            const createdAt = new Date(campaign.created_at);
            const endDate = details.endDate
              ? new Date(
                  `${details.endDate.year}-${String(details.endDate.month).padStart(2, "0")}-${String(details.endDate.day).padStart(2, "0")}`
                )
              : null;

            const isWithinDateRange = createdAt <= currentDate && (!endDate || endDate >= currentDate);
            const isWithinBudget = campaignTotalSpent < budget;
            const isActive = campaign.is_active && isWithinDateRange && isWithinBudget;

            // Attach the uploaded_file from the frames table
            const uploadedFile = campaign.selected_publishers?.[0]?.id
              ? uploadedFilesMap[campaign.selected_publishers[0].id]
              : undefined;

            return {
              ...campaign,
              clicks,
              impressions,
              pricePerClick,
              isActive,
              uploaded_file: uploadedFile,
            };
          });

        const avgCostPerClick = totalClicks > 0 ? totalSpent / totalClicks : 0;
        const totalRemaining = Math.max(0, totalBudget - totalSpent);

        setStats({
          totalCampaigns: updatedCampaigns.length,
          totalClicks,
          avgCostPerClick,
          totalBudget,
          totalSpent,
          totalRemaining,
          totalImpressions,
        });

        setCampaigns(updatedCampaigns);
      } catch (err: any) {
        setError(err.message);
        toast({ title: "Error fetching data", description: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  return { campaigns, stats, isLoading, error };
}