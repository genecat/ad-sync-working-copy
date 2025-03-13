import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

const availableFrames = [
  { id: "frame1", size: "300x250" },
  { id: "frame2", size: "728x90" },
  { id: "frame3", size: "640x480" },
  { id: "frame4", size: "300x90" },
  { id: "frame5", size: "480x640" },
];

const ModifyListing = ({ session }) => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState({});
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newFrameSize, setNewFrameSize] = useState(availableFrames[0].size);
  const [newFramePrice, setNewFramePrice] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [selectedFrameToCopy, setSelectedFrameToCopy] = useState('all');

  useEffect(() => {
    async function fetchListing() {
      console.log("Fetching listing for ID:", listingId);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();
      if (error) {
        console.error('Error fetching listing:', error);
        setError('Error fetching listing: ' + error.message);
      } else if (data) {
        console.log("Fetched listing data:", data);
        setListing(data);
        let frames = data.selected_frames;
        if (typeof frames === 'string') {
          try {
            frames = JSON.parse(frames);
          } catch (e) {
            console.error('Error parsing selected_frames:', e);
            frames = {};
          }
        }
        setSelectedFrames(frames || {});
        setCategory(data.category || '');
        generateCode();
      }
    }
    fetchListing();
  }, [listingId]);

  const handleFramePriceChange = (frameKey, newPrice) => {
    setSelectedFrames((prev) => ({
      ...prev,
      [frameKey]: {
        ...prev[frameKey],
        pricePerClick: newPrice,
      },
    }));
    generateCode();
  };

  const addFrame = (size, price) => {
    if (!price) {
      setError('Please enter a price per click for the new frame.');
      return;
    }
    const frameKey = `frame${Date.now()}`;
    setSelectedFrames((prev) => ({
      ...prev,
      [frameKey]: { size, pricePerClick: price },
    }));
    setNewFramePrice('');
    setError('');
    generateCode();
  };

  const removeFrame = (frameKey) => {
    setSelectedFrames((prev) => {
      const updated = { ...prev };
      delete updated[frameKey];
      return updated;
    });
    generateCode();
  };

  const generateCode = () => {
    console.log("Generating embed code for frames:", selectedFrames);
    const baseUrl = "https://my-ad-agency.vercel.app";
    let code = "<!-- Ad Exchange Embed Code Start -->\n";
    Object.keys(selectedFrames).forEach((frameKey) => {
      const frameData = selectedFrames[frameKey];
      const size = frameData.size || "Unknown";
      const [width, height] = size.split("x");
      code += `<iframe src="${baseUrl}/serve-ad/${listingId}?frame=${frameKey}" `;
      code += `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n\n`;
    });
    code += "<!-- Ad Exchange Embed Code End -->";
    setEmbedCode(code);
  };

  const generateCodeForSelected = () => {
    const baseUrl = "https://my-ad-agency.vercel.app";
    if (selectedFrameToCopy === 'all') {
      generateCode();
      return;
    }
    const frameKey = selectedFrameToCopy;
    const frameData = selectedFrames[frameKey];
    if (frameData) {
      const size = frameData.size || "Unknown";
      const [width, height] = size.split("x");
      const code = `<!-- Ad Exchange Embed Code Start -->\n` +
                   `<iframe src="${baseUrl}/serve-ad/${listingId}?frame=${frameKey}" ` +
                   `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n` +
                   `<!-- Ad Exchange Embed Code End -->`;
      setEmbedCode(code);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      selected_frames: selectedFrames,
      category: category,
    };
    const { error } = await supabase
      .from('listings')
      .update(payload)
      .eq('id', listingId);
    if (error) {
      console.error('Error updating listing:', error);
      setError('Error updating listing: ' + error.message);
    } else {
      setMessage('Listing updated successfully!');
      console.log("Listing updated with payload:", payload);
      generateCode();
    }
  };

  if (!listing) return <p className="p-4 text-black">Loading listing details...</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 text-black">
      <div className="p-8 shadow border border-gray-200 rounded-xl bg-white">
        <h1 className="text-3xl font-bold mb-6">Modify Listing</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {message && <p className="text-green-500 mb-4">{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block mb-2 font-semibold">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border p-2 w-full bg-gray-100 text-black rounded"
            >
              <option value="">Select a category</option>
              <option value="Technology">Technology</option>
              <option value="Sports">Sports</option>
              <option value="Lifestyle">Lifestyle</option>
              <option value="Finance">Finance</option>
              <option value="Entertainment">Entertainment</option>
            </select>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Ad Frames</h2>
            {Object.keys(selectedFrames).length > 0 ? (
              Object.keys(selectedFrames).map((frameKey, index) => (
                <div key={frameKey} className="mb-4 p-4 border rounded bg-gray-50">
                  <p className="mb-2">
                    <strong>Frame #{index + 1}:</strong> {frameKey} - Size: {selectedFrames[frameKey].size}
                  </p>
                  <label className="block mb-2">
                    Price per Click:
                    <input
                      type="number"
                      value={selectedFrames[frameKey].pricePerClick}
                      onChange={(e) => handleFramePriceChange(frameKey, e.target.value)}
                      className="ml-2 border p-1 bg-gray-100 text-black rounded"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeFrame(frameKey)}
                    className="mt-1 px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Remove Frame
                  </button>
                </div>
              ))
            ) : (
              <p>No ad frames selected.</p>
            )}
            <div className="mt-4">
              <label className="block mb-2 font-semibold">Add New Frame:</label>
              <div className="flex flex-col sm:flex-row gap-4 mb-2">
                <select
                  value={newFrameSize}
                  onChange={(e) => setNewFrameSize(e.target.value)}
                  className="border p-2 w-full sm:w-1/2 bg-gray-100 text-black rounded"
                >
                  {availableFrames.map((frame) => (
                    <option key={frame.id} value={frame.size}>
                      {frame.size}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newFramePrice}
                  onChange={(e) => setNewFramePrice(e.target.value)}
                  placeholder="Price per Click"
                  className="border p-2 w-full sm:w-1/2 bg-gray-100 text-black rounded"
                />
              </div>
              <button
                type="button"
                onClick={() => addFrame(newFrameSize, newFramePrice)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Add New Frame
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="block mb-2 font-semibold">Select Frame to Copy:</label>
            <select
              value={selectedFrameToCopy}
              onChange={(e) => setSelectedFrameToCopy(e.target.value)}
              className="border p-2 w-full bg-gray-100 text-black rounded mb-2"
            >
              <option value="all">All Frames</option>
              {Object.keys(selectedFrames).map((frameKey) => (
                <option key={frameKey} value={frameKey}>
                  {frameKey} ({selectedFrames[frameKey].size})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={generateCodeForSelected}
              className="mb-2 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Generate HTML Code
            </button>
            {embedCode && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Your Embed Code:</h2>
                <textarea
                  readOnly
                  value={embedCode}
                  className="w-full h-40 p-2 border rounded bg-gray-100 text-black placeholder-gray-500"
                />
                <div className="mt-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(embedCode)}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Copy Code
                  </button>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded">
            Save Modifications
          </button>
        </form>

        <div className="mt-6">
          <Link to="/listings" className="text-blue-600 underline">
            Back to Listings
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ModifyListing;






