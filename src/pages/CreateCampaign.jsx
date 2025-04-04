import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadAdCreative } from "../utils/uploadCreative";

// Publisher Categories
const categories = ["Technology", "Sports", "Lifestyle", "Finance", "Entertainment"];

export default function CreateCampaign({ session }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Step 1: Publisher search
  const [selectedCategory, setSelectedCategory] = useState("");
  const [publisherResults, setPublisherResults] = useState([]);
  const [selectedPublishers, setSelectedPublishers] = useState([]);

  // Step 2: Campaign details
  const [campaignDetails, setCampaignDetails] = useState({
    title: "",
    budget: "",
    dailyLimit: "",
    targetURL: "",
    endDate: { year: "", month: "", day: "" },
  });

  // Step 3: Publisher-specific details
  const [publisherDetails, setPublisherDetails] = useState({});

  // Step 1: handleSearchPublishers
  async function handleSearchPublishers() {
    setError(null);
    if (!selectedCategory) {
      setError("Please select a category.");
      return;
    }
    try {
      const { data: listings, error: listingsError } = await supabase
        .from("listings")
        .select("*, publisher_id")
        .eq("category", selectedCategory);

      if (listingsError) throw listingsError;
      if (!listings || listings.length === 0) {
        setPublisherResults([]);
        setError("No listings found for this category.");
        return;
      }

      const { data: vacantFrames, error: vacantError } = await supabase
        .rpc("get_vacant_frames");

      if (vacantError) throw vacantError;

      console.log("Vacant Frames:", vacantFrames);

      const listingIds = listings.map((listing) => listing.id.toString());
      const filteredVacantFrames = vacantFrames.filter((vf) =>
        listingIds.includes(vf.listing_id.toString())
      );

      console.log("Filtered Vacant Frames:", filteredVacantFrames);

      const parsedData = listings
        .map((listing) => {
          let frames = listing.selected_frames;
          if (typeof frames === "string") {
            try {
              frames = JSON.parse(frames);
            } catch (parseErr) {
              console.error("Error parsing selected_frames:", parseErr);
              frames = {};
            }
          }
          listing.selected_frames = frames || {};

          const vacantFramesForListing = filteredVacantFrames
            .filter((vf) => vf.listing_id.toString() === listing.id.toString())
            .reduce((acc, vf) => {
              acc[vf.frame_key] = listing.selected_frames[vf.frame_key] || {};
              return acc;
            }, {});

          return { ...listing, selected_frames: vacantFramesForListing };
        })
        .filter((listing) => Object.keys(listing.selected_frames).length > 0);

      if (parsedData.length === 0) {
        setError("No publishers with vacant frames found for this category.");
      }

      setPublisherResults(parsedData);
      console.log("Parsed Publisher Data with Vacant Frames:", parsedData);
    } catch (err) {
      setError("Error fetching publishers: " + err.message);
      console.log("handleSearchPublishers error:", err);
    }
  }

  // Toggle publisher selection
  function togglePublisherSelection(pub) {
    const alreadySelected = selectedPublishers.some((p) => p.id === pub.id);
    if (alreadySelected) {
      setSelectedPublishers((prev) => prev.filter((p) => p.id !== pub.id));
      setPublisherDetails((prev) => {
        const updated = { ...prev };
        delete updated[pub.id];
        return updated;
      });
    } else {
      setSelectedPublishers((prev) => [...prev, pub]);
    }
  }

  // Campaign details
  function handleCampaignDetailChange(e) {
    const { name, value } = e.target;
    setCampaignDetails((prev) => ({ ...prev, [name]: value }));
  }

  function handleEndDateChange(field, val) {
    setCampaignDetails((prev) => ({
      ...prev,
      endDate: { ...prev.endDate, [field]: val },
    }));
  }

  // Frame choices & upload
  function toggleFrameChoice(pubId, frameKey, isSelected) {
    setPublisherDetails((prev) => {
      const existing = prev[pubId] || {};
      const framesChosen = existing.framesChosen || {};
      return {
        ...prev,
        [pubId]: {
          ...existing,
          framesChosen: { ...framesChosen, [frameKey]: isSelected },
        },
      };
    });
  }

  async function handleFileUpload(e, pubId, frameKey) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      alert("No file selected.");
      return;
    }
    try {
      const filePath = await uploadAdCreative(file, pubId, frameKey);
      setPublisherDetails((prev) => {
        const existing = prev[pubId] || {};
        const uploads = existing.uploads || {};
        return {
          ...prev,
          [pubId]: {
            ...existing,
            uploads: { ...uploads, [frameKey]: filePath },
          },
        };
      });
      const publicUrl = getPublicUrl(filePath);
      alert(`File uploaded successfully:\n${publicUrl}`);
    } catch (err) {
      setError(err.message);
    }
  }

  // ---- UPDATED finalSubmit FUNCTION WITH LOGGING ----
  async function finalSubmit() {
    setError(null);
    if (!session || !session.user) {
      setError("User not authenticated.");
      return;
    }

    for (const pub of selectedPublishers) {
      const pubId = pub.id;
      const framesChosen = publisherDetails[pubId]?.framesChosen || {};
      const selectedFrames = Object.entries(framesChosen)
        .filter(([_, isSelected]) => isSelected)
        .map(([frameKey]) => frameKey);

      for (const frameKey of selectedFrames) {
        const { data: isVacant, error: validationError } = await supabase
          .rpc("is_frame_vacant", {
            p_listing_id: pubId,
            p_frame_key: frameKey,
          });

        if (validationError) {
          setError("Error validating frame availability: " + validationError.message);
          return;
        }
        if (!isVacant) {
          setError(
            `Frame ${frameKey} in listing ${pub.website} is no longer available. ` +
              "Please go back and select a different frame."
          );
          return;
        }
      }
    }

    // Fetch the publisher's user ID for each selected listing
    const publishersWithUserIds = await Promise.all(
      selectedPublishers.map(async (pub) => {
        const { data: listing, error: listingError } = await supabase
          .from("listings")
          .select("publisher_id")
          .eq("id", pub.id)
          .single();
        if (listingError) {
          console.error("Error fetching publisher_id for listing:", pub.id, listingError);
          throw new Error(`Failed to fetch publisher_id for listing ${pub.id}`);
        }
        return { ...pub, publisher_user_id: listing.publisher_id };
      })
    );

    const payload = {
      advertiser_id: session.user.id,
      name: campaignDetails.title,
      campaign_details: campaignDetails,
      selected_publishers: publishersWithUserIds.map((pub) => {
        const pubId = pub.id;
        const framesChosen = publisherDetails[pubId]?.framesChosen || {};
        const purchasedFrames = Object.entries(framesChosen)
          .filter(([_, isSelected]) => isSelected)
          .map(([frameKey]) => {
            const frameData = pub.selected_frames?.[frameKey] || {};
            return {
              size: frameData.size || "Unknown Dimensions",
              pricePerClick: frameData.pricePerClick || "N/A",
              uploadedFile: publisherDetails[pubId]?.uploads?.[frameKey] || null,
            };
          });

        return {
          id: pub.id,
          publisher_user_id: pub.publisher_user_id, // Add the publisher's user ID
          url: pub.website || "No URL",
          frames_purchased: purchasedFrames,
          extra_details: publisherDetails[pubId] || {},
        };
      }),
    };

    try {
      console.log("Creating campaign with payload:", payload);
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .insert([payload])
        .select()
        .single();
      if (campaignError) throw campaignError;
      console.log("Campaign created:", campaignData);

      // Insert frames into the frames table
      for (const pub of selectedPublishers) {
        const pubId = pub.id;
        const framesChosen = publisherDetails[pubId]?.framesChosen || {};
        console.log("Frames chosen for publisher", pubId, ":", framesChosen);
        const purchasedFrames = Object.entries(framesChosen)
          .filter(([_, isSelected]) => isSelected)
          .map(([frameKey]) => {
            const frameData = pub.selected_frames?.[frameKey] || {};
            return {
              frame_id: frameKey,
              campaign_id: campaignData.id,
              listing_id: pubId,
              publisher_id: pubId,
              size: frameData.size || "Unknown Dimensions",
              uploaded_file: publisherDetails[pubId]?.uploads?.[frameKey] || null,
              price_per_click: frameData.pricePerClick || "0.00",
            };
          });

        console.log("Purchased frames to insert:", purchasedFrames);
        if (purchasedFrames.length > 0) {
          const { data: frameData, error: frameError } = await supabase
            .from("frames")
            .insert(purchasedFrames)
            .select();
          if (frameError) throw frameError;
          console.log("Frames inserted:", frameData);
        } else {
          console.log("No frames to insert for publisher", pubId);
        }
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
      console.error("Error in finalSubmit:", err);
    }
  }
  // ---- END UPDATED FUNCTION ----

  // Convert file path to public URL
  function getPublicUrl(filePath) {
    return `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${filePath}`;
  }

  // Render steps
  function renderStep() {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 p-6 bg-white shadow-md rounded-xl">
            <h2 className="text-2xl font-semibold">Step 1: Select Publisher Category</h2>
            <label className="block font-medium">
              Category:
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border p-2 mt-2 text-black bg-gray-100 rounded"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={handleSearchPublishers}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Search Publishers
            </button>

            <div>
              <h3 className="text-2xl font-semibold mt-4">Search Results:</h3>
              {publisherResults.length > 0 ? (
                <div className="space-y-3">
                  {publisherResults.map((pub) => (
                    <div key={pub.id} className="border p-3 rounded bg-gray-50">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedPublishers.some((p) => p.id === pub.id)}
                          onChange={() => togglePublisherSelection(pub)}
                          className="form-checkbox text-blue-500"
                        />
                        <span>
                          <strong>Website:</strong>{" "}
                          {pub.website ? (
                            <a
                              href={pub.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 underline"
                            >
                              {pub.website}
                            </a>
                          ) : (
                            "Unknown Publisher"
                          )}{" "}
                          (ID: {pub.id})
                        </span>
                      </label>

                      {pub.selected_frames && Object.keys(pub.selected_frames).length > 0 && (
                        <div className="ml-6 mt-2">
                          <strong>Vacant Ad Frames & Prices:</strong>
                          <ul className="list-disc list-inside">
                            {Object.entries(pub.selected_frames).map(
                              ([frameKey, frameData]) => {
                                const dim = frameData.size || "Unknown Dimensions";
                                const ppc = frameData.pricePerClick || "0.00";
                                return (
                                  <li key={frameKey}>
                                    {dim} - ${ppc} (Frame: {frameKey})
                                  </li>
                                );
                              }
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No publishers with vacant frames found for this category.</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="bg-green-600 text-white px-4 py-2 rounded"
                disabled={selectedPublishers.length === 0}
              >
                Next
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 p-6 bg-white shadow-md rounded-xl">
            <h2 className="text-2xl font-semibold">Step 2: Enter Campaign Details</h2>
            <div>
              <label className="block font-medium">
                Campaign Title:
                <input
                  type="text"
                  name="title"
                  value={campaignDetails.title}
                  onChange={handleCampaignDetailChange}
                  className="border p-2 mt-2 text-black bg-gray-100 w-full rounded"
                  placeholder="Enter campaign title"
                />
              </label>
            </div>
            <div>
              <label className="block font-medium">
                Campaign Budget ($):
                <input
                  type="number"
                  name="budget"
                  value={campaignDetails.budget}
                  onChange={handleCampaignDetailChange}
                  className="border p-2 mt-2 text-black bg-gray-100 w-full rounded"
                />
              </label>
            </div>
            <div>
              <label className="block font-medium">
                Daily Spend Limit ($):
                <input
                  type="number"
                  name="dailyLimit"
                  value={campaignDetails.dailyLimit}
                  onChange={handleCampaignDetailChange}
                  className="border p-2 mt-2 text-black bg-gray-100 w-full rounded"
                />
              </label>
            </div>
            <div>
              <label className="block font-medium">
                Target URL:
                <input
                  type="text"
                  name="targetURL"
                  value={campaignDetails.targetURL}
                  onChange={handleCampaignDetailChange}
                  className="border p-2 mt-2 text-black bg-gray-100 w-full rounded"
                  placeholder="https://example.com"
                />
              </label>
            </div>
            <div>
              <label className="block font-medium mb-1">End Date:</label>
              <div className="flex items-center space-x-4">
                <div>
                  <span className="mr-1">Year:</span>
                  <input
                    type="number"
                    value={campaignDetails.endDate.year}
                    onChange={(e) => handleEndDateChange("year", e.target.value)}
                    className="border p-2 text-black bg-gray-100 w-20 rounded"
                  />
                </div>
                <div>
                  <span className="mr-1">Month:</span>
                  <input
                    type="number"
                    value={campaignDetails.endDate.month}
                    onChange={(e) => handleEndDateChange("month", e.target.value)}
                    className="border p-2 text-black bg-gray-100 w-20 rounded"
                  />
                </div>
                <div>
                  <span className="mr-1">Day:</span>
                  <input
                    type="number"
                    value={campaignDetails.endDate.day}
                    onChange={(e) => handleEndDateChange("day", e.target.value)}
                    className="border p-2 text-black bg-gray-100 w-20 rounded"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Next
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 p-6 bg-white shadow-md rounded-xl">
            <h2 className="text-2xl font-semibold">Step 3: Add Publisher-Specific Details</h2>
            {selectedPublishers.length > 0 ? (
              selectedPublishers.map((pub) => {
                const pubId = pub.id;
                const frames = pub.selected_frames || {};

                return (
                  <div key={pubId} className="border p-4 rounded mb-4 bg-gray-50">
                    <h3 className="font-semibold">
                      Publisher: {pub.website || "Unknown Publisher"} (ID: {pub.id})
                    </h3>
                    <p>
                      Website:{" "}
                      {pub.website ? (
                        <a
                          href={pub.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          {pub.website}
                        </a>
                      ) : (
                        "No URL"
                      )}
                    </p>
                    {Object.keys(frames).length > 0 ? (
                      <div className="ml-4 mt-2">
                        <strong>Select Frames to Purchase:</strong>
                        <ul className="list-disc list-inside">
                          {Object.entries(frames).map(([frameKey, frameData]) => {
                            const isChosen = !!publisherDetails[pubId]?.framesChosen?.[frameKey];
                            const size = frameData.size || "Unknown Dimensions";
                            return (
                              <li key={frameKey} className="mt-1">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={isChosen}
                                    onChange={(e) =>
                                      toggleFrameChoice(pubId, frameKey, e.target.checked)
                                    }
                                    className="form-checkbox text-blue-500"
                                  />
                                  <span>
                                    {size} - Price: ${frameData.pricePerClick || "0.00"}
                                  </span>
                                </label>
                                {isChosen && (
                                  <div className="ml-8 mt-2">
                                    <input
                                      type="file"
                                      onChange={(e) => handleFileUpload(e, pubId, frameKey)}
                                      className="border p-2 text-black bg-gray-100 rounded"
                                    />
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-2">No vacant frames available for this publisher.</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No publishers selected.</p>
            )}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Next
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 p-6 bg-white shadow-md rounded-xl">
            <h2 className="text-2xl font-semibold">Step 4: Review Campaign Details</h2>
            <div className="border p-4 rounded shadow bg-gray-50">
              <h3 className="font-bold text-xl mb-2">Campaign Details</h3>
              <p><strong>Title:</strong> {campaignDetails.title}</p>
              <p><strong>Budget:</strong> ${campaignDetails.budget}</p>
              <p><strong>Daily Spend Limit:</strong> ${campaignDetails.dailyLimit}</p>
              <p>
                <strong>Target URL:</strong>{" "}
                {campaignDetails.targetURL ? (
                  <a
                    href={campaignDetails.targetURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    {campaignDetails.targetURL}
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
              <p>
                <strong>End Date:</strong> {campaignDetails.endDate.year}-
                {campaignDetails.endDate.month}-{campaignDetails.endDate.day}
              </p>
            </div>
            <div className="border p-4 rounded shadow bg-gray-50">
              <h3 className="font-bold text-xl mb-2">Selected Publishers</h3>
              {selectedPublishers.map((pub) => {
                const pubId = pub.id;
                const framesChosen = publisherDetails[pubId]?.framesChosen || {};
                const selectedFrames = Object.entries(framesChosen)
                  .filter(([_, isSelected]) => isSelected)
                  .map(([frameKey]) => frameKey);

                return (
                  <div key={pubId} className="border p-2 rounded mb-2 bg-white">
                    <p>
                      <strong>Website:</strong>{" "}
                      {pub.website ? (
                        <a
                          href={pub.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          {pub.website}
                        </a>
                      ) : (
                        "No URL"
                      )}
                    </p>
                    {selectedFrames.length > 0 ? (
                      <div className="mt-2">
                        <strong>Selected Ad Frames and Uploads:</strong>
                        <ul className="list-disc list-inside ml-4">
                          {selectedFrames.map((frameKey) => {
                            const frameData = pub.selected_frames?.[frameKey] || {};
                            const size = frameData.size || "Unknown Dimensions";
                            const uploadedFile = publisherDetails[pubId]?.uploads?.[frameKey];
                            const ppc = frameData.pricePerClick || "0.00";
                            return (
                              <li key={frameKey}>
                                {size} - Price: ${ppc} (Frame: {frameKey})
                                {uploadedFile ? (
                                  <div className="mt-1">
                                    <img
                                      src={getPublicUrl(uploadedFile)}
                                      alt={`${size} ad`}
                                      className="max-w-xs border rounded"
                                      onError={(e) =>
                                        console.error(
                                          `Failed to load image for ${frameKey}: ${getPublicUrl(
                                            uploadedFile
                                          )}`
                                        )
                                      }
                                    />
                                  </div>
                                ) : (
                                  <p className="text-red-500 ml-4">
                                    No ad creative uploaded for this frame.
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-2">No frames selected for this publisher.</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Submit Campaign
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 p-6 bg-white shadow-md rounded-xl">
            <h2 className="text-2xl font-semibold">Step 5: Finalizing Campaign...</h2>
            {!submitted ? (
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={finalSubmit}>
                Confirm Submit
              </button>
            ) : (
              <p className="text-green-600">Campaign Submitted Successfully!</p>
            )}
          </div>
        );

      default:
        return <div>Invalid Step</div>;
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto my-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Campaign</h1>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      {renderStep()}
    </div>
  );
}