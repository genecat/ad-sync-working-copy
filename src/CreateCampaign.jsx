import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

// ===========================
// 2) PUBLISHER CATEGORIES
// ===========================
const categories = ["Technology", "Sports", "Lifestyle", "Finance", "Entertainment"];

// ===========================
// 3) MAIN COMPONENT
// ===========================
export default function CreateCampaign({ session }) {
  // ---------------------------
  // A. STATE DECLARATIONS
  // ---------------------------
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

  // Step 3: Publisher-specific details (frame selections, file uploads)
  // Structure: { publisherId: { framesChosen: { frameKey: true }, uploads: { frameKey: filePath } } }
  const [publisherDetails, setPublisherDetails] = useState({});

  // ---------------------------
  // B. PARSE SELECTED_FRAMES
  //    WHEN FETCHING PUBLISHERS
  // ---------------------------
  async function handleSearchPublishers() {
    setError(null);
    if (!selectedCategory) {
      setError("Please select a category.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*") // fetch everything so we can parse
        .eq("category", selectedCategory);

      if (error) throw error;
      if (!data) {
        setPublisherResults([]);
        return;
      }

      // Convert selected_frames if it's a JSON string
      const parsedData = data.map((pub) => {
        let frames = pub.selected_frames;

        if (typeof frames === "string") {
          try {
            frames = JSON.parse(frames);
          } catch (parseErr) {
            console.error("Error parsing selected_frames:", parseErr);
            frames = {};
          }
        }

        pub.selected_frames = frames || {};
        return pub;
      });

      setPublisherResults(parsedData); console.log("Parsed Publisher Data:", parsedData);
    } catch (err) {
      setError(err.message);
console.log("handleSearchPublishers is running");
    }
  }

  // Toggle which publishers are selected
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

  // ---------------------------
  // C. CAMPAIGN DETAILS
  // ---------------------------
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

  // ---------------------------
  // D. PUBLISHER-SPECIFIC
  //    FRAME CHOICES & UPLOAD
  // ---------------------------
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
    const bucketName = "ad-creatives";
    const filePath = `${pubId}/${frameKey}/${Date.now()}_${file.name}`;
    try {
      const { error } = await supabase.storage.from(bucketName).upload(filePath, file);
      if (error) throw new Error("File upload failed: " + error.message);

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

      alert(`File uploaded successfully: ${filePath}`);
    } catch (err) {
      setError(err.message);
    }
  }

  // ---------------------------
  // E. FINAL SUBMISSION
  // ---------------------------
  async function finalSubmit() {
    setError(null);
    if (!session || !session.user) {
      setError("User not authenticated.");
      return;
    }

    const payload = {
      advertiser_id: session.user.id,
      name: campaignDetails.title,
      campaign_details: campaignDetails,
      selected_publishers: selectedPublishers.map((pub) => {
        const pubId = pub.id;
        const framesChosen = publisherDetails[pubId]?.framesChosen || {};
        // Build purchased frames array
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
          url: pub.website || "No URL",
          frames_purchased: purchasedFrames,
          extra_details: publisherDetails[pubId] || {},
        };
      }),
    };

    try {
      const { data, error } = await supabase.from("campaigns").insert([payload]);
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  }

  // Convert file path to public URL
  function getPublicUrl(filePath) {
    return `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${filePath}`;
  }

  // ---------------------------
  // F. RENDER STEPS
  // ---------------------------
  function renderStep() {
    switch (step) {
      // STEP 1: SELECT PUBLISHER CATEGORY
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

                      {/* Show frames if present */}
                      {pub.selected_frames && Object.keys(pub.selected_frames).length > 0 && (
                        <div className="ml-6 mt-2">
                          <strong>Ad Frames & Prices:</strong>
                          <ul className="list-disc list-inside">
                            {Object.entries(pub.selected_frames).map(([frameKey, frameData]) => {
                              const dim = frameData.size || "Unknown Dimensions";
                              const ppc = frameData.pricePerClick || "0.00";
                              return (
                                <li key={frameKey}>
                                  {dim} - ${ppc}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No publishers found for this category.</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Next
              </button>
            </div>
          </div>
        );

      // STEP 2: ENTER CAMPAIGN DETAILS
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

      // STEP 3: PUBLISHER-SPECIFIC DETAILS
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
                      <p className="mt-2">No frames set by this publisher.</p>
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

      // STEP 4: REVIEW CAMPAIGN DETAILS
      case 4:
        return (
          <div className="space-y-6 p-6 bg-white shadow-md rounded-xl">
            <h2 className="text-2xl font-semibold">Step 4: Review Campaign Details</h2>

            {/* Campaign Info */}
            <div className="border p-4 rounded shadow bg-gray-50">
              <h3 className="font-bold text-xl mb-2">Campaign Details</h3>
              <p>
                <strong>Title:</strong> {campaignDetails.title}
              </p>
              <p>
                <strong>Budget:</strong> ${campaignDetails.budget}
              </p>
              <p>
                <strong>Daily Spend Limit:</strong> ${campaignDetails.dailyLimit}
              </p>
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

            {/* Publishers */}
            <div className="border p-4 rounded shadow bg-gray-50">
              <h3 className="font-bold text-xl mb-2">Selected Publishers</h3>
              {selectedPublishers.map((pub) => (
                <div key={pub.id} className="border p-2 rounded mb-2 bg-white">
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

                  {pub.selected_frames && Object.keys(pub.selected_frames).length > 0 && (
                    <div className="mt-2">
                      <strong>Ad Frame Dimension(s) and Prices:</strong>
                      <ul className="list-disc list-inside ml-4">
                        {Object.entries(pub.selected_frames).map(([frameKey, frameData]) => {
                          const size = frameData.size || "Unknown Dimensions";
                          const uploadedFile = publisherDetails[pub.id]?.uploads?.[frameKey];
                          const ppc = frameData.pricePerClick || "0.00";
                          return (
                            <li key={frameKey}>
                              {size} - Price: ${ppc}
                              {uploadedFile && (
                                <div className="mt-1">
                                  <img
                                    src={getPublicUrl(uploadedFile)}
                                    alt={`${size} ad`}
                                    className="max-w-xs border rounded"
                                  />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
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

      // STEP 5: FINAL SUBMISSION
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

  // ---------------------------
  // G. MAIN RENDER
  // ---------------------------
  return (
    <div className="p-6 max-w-5xl mx-auto my-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Campaign</h1>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      {renderStep()}
    </div>
  );
}










