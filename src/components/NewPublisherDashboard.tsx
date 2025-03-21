import React from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { PlusCircle, BarChart3, DollarSign, MousePointer, Image, AlertCircle } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { usePublisherDashboardData } from "../hooks/usePublisherDashboardData";

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
  campaigns: {
    name: string;
    termination_date?: string;
    creativeImage?: string;
  } | null;
}

const NewPublisherDashboard = () => {
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

  const handleDeleteListing = async (id: string) => {
    try {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Listing deleted",
        description: "The listing has been successfully removed",
      });
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Error deleting listing",
        description: err.message,
      });
    }
  };

  const totalCampaigns = campaignStats.length;
  const avgPPC =
    totalClicks > 0 ? (totalEarnings / totalClicks).toFixed(2) : "0.00";

  const extractWebsiteName = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 py-8 md:px-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-2">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Dashboard
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Publisher Dashboard
            </h1>
          </div>
          <Link to="/create-listing-final">
            <Button className="btn-primary h-10">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Listing
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[400px] rounded-xl mt-6" />
          </>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">
                      Total Campaigns
                    </p>
                    <p className="text-2xl font-semibold">{totalCampaigns}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">
                      Total Impressions
                    </p>
                    <p className="text-2xl font-semibold">{totalImpressions}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <Image className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">
                      Total Clicks
                    </p>
                    <p className="text-2xl font-semibold">{totalClicks}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                    <MousePointer className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">
                      Total Earnings
                    </p>
                    <p className="text-2xl font-semibold">
                      ${totalEarnings.toFixed(2)}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-yellow-50 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">
                      Avg. PPC
                    </p>
                    <p className="text-2xl font-semibold">${avgPPC}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Website listings */}
            <div className="mt-6">
              {Object.keys(websites).map((website) => (
                <div key={website} className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                      Listing: {extractWebsiteName(website)}
                    </h2>
                    {websites[website].length > 0 && (
                      <div className="flex space-x-2">
                        <Link to={`/modify-listing/${websites[website][0].id}`}>
                          <Button className="bg-blue-500 text-white px-4 py-2 rounded">
                            Modify Listing
                          </Button>
                        </Link>
                        <Button
                          className="bg-red-500 text-white px-4 py-2 rounded"
                          onClick={() =>
                            handleDeleteListing(websites[website][0].id)
                          }
                        >
                          Delete Listing
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">Ad Frames</h3>
                      {websites[website].length > 0 && (
                        <Link
                          to={`/modify-listing/${websites[website][0].id}`}
                        >
                          <Button className="bg-green-500 text-white px-4 py-2 rounded">
                            Add a New Ad Frame
                          </Button>
                        </Link>
                      )}
                    </div>

                    {websites[website].length > 0 ? (
                      websites[website].map((listing: Listing) => (
                        <div
                          key={listing.id}
                          className="mb-4 p-6 border rounded-xl shadow-sm"
                        >
                          {Object.keys(listing.selected_frames || {}).length >
                          0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                              {Object.keys(listing.selected_frames).map(
                                (frame) => {
                                  const frameData =
                                    listing.selected_frames[frame];
                                  return (
                                    <div
                                      key={frame}
                                      className="p-4 border rounded-lg bg-gray-50"
                                    >
                                      <p className="text-sm font-medium">
                                        Frame: {frame}
                                      </p>
                                      <p className="text-sm">
                                        Frame Size: {frameData.size}
                                      </p>
                                      <p className="text-sm">
                                        Price per Click: $
                                        {parseFloat(
                                          frameData.pricePerClick || "0"
                                        ).toFixed(2)}
                                      </p>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              No ad frames available.
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <Card className="p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
                        <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                          <Image className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          No listings found for this website
                        </h3>
                        <p className="text-gray-500 max-w-md mb-6">
                          You haven't created any listings for this website yet.
                        </p>
                        <Link to="/create-listing-final">
                          <Button className="btn-primary">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Listing
                          </Button>
                        </Link>
                      </Card>
                    )}
                  </div>

                  {/* Live Campaigns */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Live Campaigns</h3>
                    {websites[website].length > 0 ? (
                      websites[website].map((listing: Listing) => {
                        const websiteCampaigns = campaignStats.filter(
                          (stat) => stat.listing_id === listing.id
                        );
                        return websiteCampaigns.length > 0 ? (
                          websiteCampaigns.map(
                            (stat: CampaignStat, index: number) => {
                              const frameData =
                                listing.selected_frames?.[stat.frame];
                              const pricePerClick = parseFloat(
                                frameData?.pricePerClick || "0"
                              );
                              const earnings =
                                (stat.click_count || 0) * pricePerClick;
                              const campaignName =
                                stat.campaigns?.name ||
                                (stat.campaign_id === "unknown"
                                  ? "Unknown"
                                  : stat.campaign_id);

                              return (
                                <div
                                  key={index}
                                  className="mb-4 p-4 border rounded-xl shadow-sm flex items-start justify-between"
                                >
                                  <div>
                                    <p className="text-sm font-medium mb-1">
                                      Campaign Title: {campaignName}
                                    </p>
                                    <p className="text-sm">
                                      Frame: {stat.frame}
                                    </p>
                                    <p className="text-sm">
                                      Frame Size:{" "}
                                      {frameData?.size || "Unknown"}
                                    </p>
                                    <p className="text-sm">
                                      Price per Click: $
                                      {pricePerClick.toFixed(2)}
                                    </p>
                                    <p className="text-sm">
                                      Total Impressions:{" "}
                                      {stat.impression_count || 0}
                                    </p>
                                    <p className="text-sm">
                                      Total Clicks: {stat.click_count || 0}
                                    </p>
                                    <p className="text-sm">
                                      Total Earnings: ${earnings.toFixed(2)}
                                    </p>
                                    <p className="text-sm">
                                      Termination Date:{" "}
                                      {stat.campaigns?.termination_date ||
                                        "N/A"}
                                    </p>
                                  </div>

                                  {stat.campaigns?.creativeImage ? (
                                    <img
                                      src={`https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/${stat.campaigns.creativeImage}`}
                                      alt="Campaign Thumbnail"
                                      className="w-20 h-20 object-cover ml-4 rounded"
                                    />
                                  ) : (
                                    <img
                                      src="https://via.placeholder.com/80?text=No+Image"
                                      alt="Placeholder Thumbnail"
                                      className="w-20 h-20 object-cover ml-4 rounded"
                                    />
                                  )}
                                </div>
                              );
                            }
                          )
                        ) : (
                          <p className="text-sm text-gray-500">
                            No campaigns running on this website.
                          </p>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">
                        No campaigns available.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewPublisherDashboard;
