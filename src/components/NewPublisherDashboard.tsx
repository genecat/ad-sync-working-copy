import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { PlusCircle, BarChart3, DollarSign, MousePointer, Image, AlertCircle } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import ListingCard from "./ListingCard";

const NewPublisherDashboard = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [totalImpressions, setTotalImpressions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // On mount, fetch all listings and impressions for the logged-in publisher
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // 1) Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        const user = userData?.user;
        console.log("User fetched:", user);
        if (!user) throw new Error("No user is logged in");

        // 2) Fetch the user's profile to get publisher_id
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();
        if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);
        const publisherId = profileData?.id;
        console.log("Publisher ID:", publisherId);
        if (!publisherId) throw new Error("Publisher ID not found in profiles");

        // 3) Fetch all listings for this publisher
        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select("*")
          .eq("publisher_id", publisherId);
        if (listingError) throw new Error(`Listings fetch error: ${listingError.message}`);
        console.log("Fetched listings from DB:", listingData);
        if (!listingData || listingData.length === 0) {
          throw new Error(`No listings found for publisher_id: ${publisherId}`);
        }
        setListings(listingData);

        // 4) Fetch campaigns where any selected_publishers.id matches the listing IDs and sum impressions
        const listingIds = listingData.map((l) => l.id).map(id => `'${id}'`);
        const { data: campaignData, error: campaignError } = await supabase.rpc('custom_campaigns_by_listing_ids', { listing_ids: listingIds });
        if (campaignError) throw new Error(`Campaigns fetch error: ${campaignError.message}`);
        console.log("Fetched campaigns from DB:", campaignData);
        const totalImp = campaignData.reduce((sum, campaign) => {
          const campaignImpressions = parseInt(campaign.impressions || "0", 10) || 0;
          console.log("Campaign impressions:", campaignImpressions, "for campaign:", campaign);
          return sum + campaignImpressions;
        }, 0);
        setTotalImpressions(totalImp);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message);
        toast({
          variant: "destructive",
          title: "Error fetching data",
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  // For stats
  const totalListings = listings.length;

  // Calculate total clicks
  const totalClicks = listings.reduce((sum, listing) => {
    let selectedFrames = listing.selected_frames || {};
    if (typeof selectedFrames === "string") {
      try {
        selectedFrames = JSON.parse(selectedFrames);
      } catch {
        selectedFrames = {};
      }
    }
    console.log("Debug Frame Data for listing", listing.id, ":", selectedFrames);

    let listingClicks = 0;
    Object.values(selectedFrames).forEach((frame: any) => {
      const c = parseInt(frame?.clicks || "0", 10);
      console.log("Frame clicks:", c, "for frame:", frame);
      listingClicks += c;
    });
    return sum + listingClicks;
  }, 0);

  // Calculate total earnings
  const totalEarnings = listings.reduce((sum, listing) => {
    let selectedFrames = listing.selected_frames || {};
    if (typeof selectedFrames === "string") {
      try {
        selectedFrames = JSON.parse(selectedFrames);
      } catch {
        selectedFrames = {};
      }
    }
    let listingEarnings = 0;
    Object.values(selectedFrames).forEach((frame: any) => {
      const c = parseInt(frame?.clicks || "0", 10);
      const ppc = parseFloat(frame?.pricePerClick || "0");
      console.log("Frame ppc:", ppc, "for frame:", frame);
      listingEarnings += c * ppc;
    });
    return sum + listingEarnings;
  }, 0);

  // Delete listing
  const handleDeleteListing = async (id: string) => {
    console.log("Attempting to delete listing with ID:", id); // Log before delete
    try {
      const { data, error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);
      console.log("Delete response:", { data, error }); // Log after delete
      if (error) throw error;
      // Refetch listings to sync with Supabase
      const { data: updatedListings, error: fetchError } = await supabase
        .from("listings")
        .select("*")
        .eq("publisher_id", (await supabase.auth.getUser()).data.user.id);
      if (fetchError) throw fetchError;
      setListings(updatedListings || []);
      toast({
        title: "Listing deleted",
        description: "The listing has been successfully removed",
      });
    } catch (err: any) {
      console.error("Error deleting listing:", err);
      toast({
        variant: "destructive",
        title: "Error deleting listing",
        description: err.message,
      });
    }
  };

  // If totalClicks > 0, compute average
  const avgPrice = totalClicks > 0 ? (totalEarnings / totalClicks).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-white px-6 py-8 md:px-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
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
          <Button className="btn-primary h-10 self-start md:self-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Listing
          </Button>
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
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="p-6 shadow-sm border border-gray-100 animate-fade-up">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Listings</p>
                    <p className="text-2xl font-semibold text-center">{totalListings}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 shadow-sm border border-gray-100 animate-fade-up">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Impressions</p>
                    <p className="text-2xl font-semibold text-center">{totalImpressions}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <Image className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 shadow-sm border border-gray-100 animate-fade-up">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Clicks</p>
                    <p className="text-2xl font-semibold text-center">{totalClicks}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                    <MousePointer className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 shadow-sm border border-gray-100 animate-fade-up">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Earnings</p>
                    <p className="text-2xl font-semibold text-center">${totalEarnings.toFixed(2)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-yellow-50 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 shadow-sm border border-gray-100 animate-fade-up">
                <div className="flex items-start justify-between">
                  <div className="text-center w-full">
                    <p className="text-sm text-gray-500 font-medium mb-1">Avg. PPC</p>
                    <p className="text-2xl font-semibold text-center">${avgPrice}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Listings */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">Your Listings</h2>
              {listings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing, index) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onDelete={(id) => handleDeleteListing(id)}
                      animationDelay={index * 100}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <Image className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No listings found</h3>
                  <p className="text-gray-500 max-w-md mb-6">
                    You haven't created any listings yet.
                  </p>
                  <Button className="btn-primary">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Listing
                  </Button>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewPublisherDashboard;


