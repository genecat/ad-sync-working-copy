import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/use-toast";

function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const { toast } = useToast();

  // Fetch user ID and role on mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching user in Messages.jsx:", userError);
        toast({ title: "Error", description: userError.message });
        return;
      }
      setUserId(userData?.user?.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData?.user?.id)
        .single();
      if (profileError) {
        console.error("Error fetching user role in Messages.jsx:", profileError);
        toast({ title: "Error", description: profileError.message });
        return;
      }
      console.log("User role:", profile?.role);
      setRole(profile?.role);
    };
    fetchUserId();
  }, [toast]);

  // Fetch campaigns, users, and messages
  const fetchData = async () => {
    if (!userId || !role) return;
    try {
      setIsLoading(true);

      // Fetch campaigns the user is involved in
      let userCampaigns = [];
      if (role === "advertiser") {
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select("id, name")
          .eq("advertiser_id", userId)
          .eq("is_archived", false);
        if (campaignError) {
          console.error("Campaign fetch error details:", campaignError);
          throw new Error(`Campaign fetch error: ${campaignError.message}`);
        }
        userCampaigns = campaignData;
      } else if (role === "publisher") {
        // Step 1: Fetch the publisher's listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select("id")
          .eq("publisher_id", userId);
        if (listingsError) {
          console.error("Listings fetch error details:", listingsError);
          throw new Error(`Listings fetch error: ${listingsError.message}`);
        }
        console.log("Fetched listings for publisher:", listingsData);

        if (listingsData.length === 0) {
          userCampaigns = [];
        } else {
          const listingIds = listingsData.map(listing => listing.id);
          // Step 2: Fetch frames associated with those listings
          const { data: framesData, error: framesError } = await supabase
            .from("frames")
            .select("campaign_id, campaigns (id, name, advertiser_id)")
            .in("listing_id", listingIds);
          if (framesError) {
            console.error("Frames fetch error details:", framesError);
            throw new Error(`Frames fetch error: ${framesError.message}`);
          }
          console.log("Fetched frames for publisher:", framesData);

          userCampaigns = framesData
            .map(frame => frame.campaigns)
            .filter(c => c)
            .filter((campaign, index, self) =>
              index === self.findIndex(c => c.id === campaign.id)
            ); // Remove duplicates
        }
      } else {
        throw new Error("Invalid user role");
      }

      console.log("Fetched campaigns:", userCampaigns);
      setCampaigns(userCampaigns);

      // Fetch users to message (only those who share a campaign)
      const campaignIds = userCampaigns.map(c => c.id);
      let processedUsers = [];
      if (campaignIds.length > 0) {
        if (role === "advertiser") {
          // Fetch publishers linked to the campaigns via frames and listings
          const { data: framesData, error: framesError } = await supabase
            .from("frames")
            .select("listing_id, listings (id, publisher_id, website, public_usernames!publisher_id (id, username))")
            .in("campaign_id", campaignIds);
          if (framesError) {
            console.error("Frames fetch error details:", framesError);
            throw new Error(`Frames fetch error: ${framesError.message}`);
          }
          console.log("Fetched frames for advertiser:", framesData);

          processedUsers = framesData
            .map(frame => ({
              id: frame.listings?.public_usernames?.id,
              username: frame.listings?.public_usernames?.username,
              displayName: frame.listings?.website || "No website listed",
            }))
            .filter(user => user.id && user.username)
            .filter((user, index, self) =>
              index === self.findIndex(u => u.id === user.id)
            ); // Remove duplicates
        } else if (role === "publisher") {
          // Fetch advertisers of the campaigns
          const { data: campaignsData, error: campaignsError } = await supabase
            .from("campaigns")
            .select("id, name, advertiser_id, public_usernames!advertiser_id (id, username)")
            .in("id", campaignIds);
          if (campaignsError) {
            console.error("Campaigns fetch error details:", campaignsError);
            throw new Error(`Campaigns fetch error: ${campaignsError.message}`);
          }
          console.log("Fetched campaigns for publisher:", campaignsData);

          processedUsers = campaignsData
            .map(campaign => ({
              id: campaign.public_usernames?.id,
              username: campaign.public_usernames?.username,
              displayName: campaign.name || "No campaigns",
            }))
            .filter(user => user.id && user.username)
            .filter((user, index, self) =>
              index === self.findIndex(u => u.id === user.id)
            ); // Remove duplicates
        }
      }
      console.log("Processed users:", processedUsers);
      setUsers(processedUsers);

      // Fetch messages (RLS will automatically filter based on campaign involvement)
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id, sender_id, receiver_id, campaign_id, message, timestamp,
          campaigns (id, name),
          sender:public_usernames!sender_id (id, username),
          receiver:public_usernames!receiver_id (id, username)
        `)
        .order("timestamp", { ascending: true });

      if (messagesError) {
        console.error("Messages fetch error details:", messagesError);
        throw new Error(`Messages fetch error: ${messagesError.message}`);
      }
      console.log(`Fetched messages for user ${userId}:`, messages);

      // Group messages by campaign_id and other user
      const groupedByCampaignAndUser = messages.reduce((acc, msg) => {
        const key = `${msg.campaign_id}-${msg.sender_id === userId ? msg.receiver_id : msg.sender_id}`;
        if (!acc[key]) {
          acc[key] = {
            campaignId: msg.campaign_id,
            campaignName: msg.campaigns?.name || "Unknown Campaign",
            otherUserId: msg.sender_id === userId ? msg.receiver_id : msg.sender_id,
            otherUser: msg.sender_id === userId ? msg.receiver?.username : msg.sender?.username,
            messages: [],
          };
        }
        acc[key].messages.push(msg);
        return acc;
      }, {});
      console.log("Grouped messages:", groupedByCampaignAndUser);

      const convos = Object.values(groupedByCampaignAndUser).map(convo => {
        const otherUser = processedUsers.find(user => user.id === convo.otherUserId);
        return {
          campaignId: convo.campaignId,
          campaignName: convo.campaignName,
          otherUserId: convo.otherUserId,
          otherUser: otherUser?.displayName || `User ${convo.otherUserId}`,
          messages: convo.messages,
          lastMessage: convo.messages[convo.messages.length - 1]?.message || "",
          lastTimestamp: convo.messages[convo.messages.length - 1]?.timestamp || "",
        };
      });
      console.log("Conversations:", convos);

      setConversations(convos);

      // Update selectedConversation if it exists
      if (selectedConversation) {
        const updatedConvo = convos.find(
          convo =>
            convo.campaignId === selectedConversation.campaignId &&
            convo.otherUserId === selectedConversation.otherUserId
        );
        if (updatedConvo) {
          setSelectedConversation(updatedConvo);
        }
      }
    } catch (err) {
      console.error("Fetch data error:", err);
      toast({ title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) {
      console.log("No message or conversation selected");
      return;
    }

    try {
      // Check if the user is authenticated
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error("User not authenticated:", userError);
        throw new Error("User not authenticated. Please log in again.");
      }

      console.log("Sending message:", {
        sender_id: userId,
        receiver_id: selectedConversation.otherUserId,
        campaign_id: selectedConversation.campaignId,
        message: newMessage.trim(),
      });

      const { data, error } = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: selectedConversation.otherUserId,
        campaign_id: selectedConversation.campaignId,
        message: newMessage.trim(),
      });

      if (error) {
        console.error("Send message error details:", error);
        throw new Error(`Send message error: ${error.message}`);
      }
      console.log("Message sent successfully:", data);

      // Optimistically update the selectedConversation with the new message
      const newMessageObj = {
        id: data?.[0]?.id || Date.now().toString(), // Use a temporary ID if data is null
        sender_id: userId,
        receiver_id: selectedConversation.otherUserId,
        campaign_id: selectedConversation.campaignId,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        sender: { id: userId, username: "You" },
        receiver: { id: selectedConversation.otherUserId, username: selectedConversation.otherUser },
        campaigns: { id: selectedConversation.campaignId, name: selectedConversation.campaignName },
      };

      setSelectedConversation(prev => ({
        ...prev,
        messages: [...prev.messages, newMessageObj],
        lastMessage: newMessage.trim(),
        lastTimestamp: newMessageObj.timestamp,
      }));

      // Update the conversations list to reflect the new lastMessage
      setConversations(prev =>
        prev.map(convo =>
          convo.campaignId === selectedConversation.campaignId &&
          convo.otherUserId === selectedConversation.otherUserId
            ? {
                ...convo,
                messages: [...convo.messages, newMessageObj],
                lastMessage: newMessage.trim(),
                lastTimestamp: newMessageObj.timestamp,
              }
            : convo
        )
      );

      setNewMessage("");
      // Fetch data to ensure consistency with the server
      await fetchData();
    } catch (err) {
      console.error("Send message catch error:", err);
      toast({ title: "Error", description: err.message });
    }
  };

  // Start a new conversation
  const startNewConversation = async () => {
    if (!selectedCampaignId || !selectedUserId) {
      toast({ title: "Error", description: "Please select a campaign and user." });
      return;
    }

    // Verify that the selected user shares the campaign
    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    const user = users.find(u => u.id === selectedUserId);
    if (!campaign || !user) {
      toast({ title: "Error", description: "Invalid campaign or user selected." });
      return;
    }

    // Check if the user is a valid recipient for this campaign
    let isValidRecipient = false;
    if (role === "advertiser") {
      const { data: framesData, error: framesError } = await supabase
        .from("frames")
        .select("listing_id, listings (publisher_id)")
        .eq("campaign_id", selectedCampaignId);
      if (framesError) {
        console.error("Frames fetch error:", framesError);
        toast({ title: "Error", description: "Failed to verify recipient." });
        return;
      }
      isValidRecipient = framesData.some(frame => frame.listings?.publisher_id === selectedUserId);
    } else if (role === "publisher") {
      isValidRecipient = campaign.advertiser_id === selectedUserId;
    }

    if (!isValidRecipient) {
      toast({ title: "Error", description: "This user is not part of the selected campaign." });
      return;
    }

    const existingConvo = conversations.find(
      convo => convo.campaignId === selectedCampaignId && convo.otherUserId === selectedUserId
    );
    if (existingConvo) {
      setSelectedConversation(existingConvo);
      setShowNewConversationForm(false);
      return;
    }

    const newConvo = {
      campaignId: selectedCampaignId,
      campaignName: campaign?.name || "Unknown Campaign",
      otherUserId: selectedUserId,
      otherUser: user?.displayName || `User ${selectedUserId}`,
      messages: [],
      lastMessage: "",
      lastTimestamp: "",
    };
    setConversations([...conversations, newConvo]);
    setSelectedConversation(newConvo);
    setShowNewConversationForm(false);
  };

  // Real-time subscription for new messages
  useEffect(() => {
    if (!userId || !role) return;

    // Fetch initial data
    fetchData();

    // Set up real-time subscription
    console.log("Setting up real-time subscription for user:", userId);
    const channel = supabase
      .channel(`messages-${userId}`) // Unique channel per user
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          console.log("New message received via subscription:", payload);
          const newMessage = payload.new;

          // Fetch additional data for the message (campaign, sender, receiver usernames)
          const { data: messageData, error: messageError } = await supabase
            .from("messages")
            .select(`
              id, sender_id, receiver_id, campaign_id, message, timestamp,
              campaigns (id, name),
              sender:public_usernames!sender_id (id, username),
              receiver:public_usernames!receiver_id (id, username)
            `)
            .eq("id", newMessage.id)
            .single();

          if (messageError) {
            console.error("Error fetching new message details:", messageError);
            toast({ title: "Error", description: "Failed to load new message details." });
            return;
          }

          console.log("Fetched new message details:", messageData);

          // Determine the other user in the conversation
          const otherUserId = messageData.sender_id === userId ? messageData.receiver_id : messageData.sender_id;
          const otherUser = users.find(user => user.id === otherUserId);
          const campaign = campaigns.find(c => c.id === messageData.campaign_id);

          // Create the message object to match the format in conversations
          const formattedMessage = {
            id: messageData.id,
            sender_id: messageData.sender_id,
            receiver_id: messageData.receiver_id,
            campaign_id: messageData.campaign_id,
            message: messageData.message,
            timestamp: messageData.timestamp,
            sender: messageData.sender,
            receiver: messageData.receiver,
            campaigns: messageData.campaigns,
          };

          // Update conversations state
          setConversations(prev => {
            const convoExists = prev.find(
              convo => convo.campaignId === messageData.campaign_id && convo.otherUserId === otherUserId
            );

            if (convoExists) {
              // Update existing conversation
              return prev.map(convo =>
                convo.campaignId === messageData.campaign_id && convo.otherUserId === otherUserId
                  ? {
                      ...convo,
                      messages: [...convo.messages, formattedMessage],
                      lastMessage: messageData.message,
                      lastTimestamp: messageData.timestamp,
                    }
                  : convo
              );
            } else {
              // Create a new conversation
              const newConvo = {
                campaignId: messageData.campaign_id,
                campaignName: campaign?.name || "Unknown Campaign",
                otherUserId: otherUserId,
                otherUser: otherUser?.displayName || `User ${otherUserId}`,
                messages: [formattedMessage],
                lastMessage: messageData.message,
                lastTimestamp: messageData.timestamp,
              };
              return [...prev, newConvo];
            }
          });

          // Update selectedConversation if it matches the conversation
          setSelectedConversation(prev => {
            if (
              prev &&
              prev.campaignId === messageData.campaign_id &&
              prev.otherUserId === otherUserId
            ) {
              return {
                ...prev,
                messages: [...prev.messages, formattedMessage],
                lastMessage: messageData.message,
                lastTimestamp: messageData.timestamp,
              };
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log("Real-time subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("Subscription is active for user:", userId);
        } else if (status === "CLOSED") {
          console.log("Subscription closed for user:", userId);
        } else if (status === "TIMED_OUT") {
          console.log("Subscription timed out for user:", userId);
        } else if (status === "CHANNEL_ERROR") {
          console.log("Subscription channel error for user:", userId);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log("Cleaning up subscription for user:", userId);
      supabase.removeChannel(channel);
    };
  }, [userId, role]);

  if (isLoading || !userId || !role) {
    return (
      <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        <div className="p-6 bg-modern-card shadow-card rounded-lg h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-10 px-4 bg-modern-bg text-modern-text">
      <h1 className="text-3xl font-boldbund mb-6">Messages</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conversations List */}
        <div className="md:col-span-1 bg-modern-card shadow-card rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Conversations</h2>
            <button
              onClick={() => setShowNewConversationForm(true)}
              className="bg-modern-primary text-white px-3 py-1 rounded-lg hover:bg-modern-primary-dark transition"
            >
              New
            </button>
          </div>
          {showNewConversationForm ? (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Start New Conversation</h3>
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1">Campaign</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select a campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1">
                  {role === "advertiser" ? "Publisher" : "Advertiser"}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select a user</option>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No users available</option>
                  )}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={startNewConversation}
                  className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
                >
                  Start
                </button>
                <button
                  onClick={() => setShowNewConversationForm(false)}
                  className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {conversations.length > 0 ? (
                conversations.map((convo) => (
                  <div
                    key={`${convo.campaignId}-${convo.otherUserId}`}
                    className={`p-3 mb-2 rounded-lg cursor-pointer ${
                      selectedConversation?.campaignId === convo.campaignId &&
                      selectedConversation?.otherUserId === convo.otherUserId
                        ? "bg-modern-primary text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    onClick={() => setSelectedConversation(convo)}
                  >
                    <p className="font-medium">{convo.campaignName}</p>
                    <p className="text-sm">{convo.otherUser}</p>
                    <p className="text-sm truncate">{convo.lastMessage}</p>
                    <p className="text-xs text-gray-500">
                      {convo.lastTimestamp ? new Date(convo.lastTimestamp).toLocaleString() : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p>No conversations yet.</p>
              )}
            </>
          )}
        </div>

        {/* Messages View */}
        <div className="md:col-span-2 bg-modern-card shadow-card rounded-lg p-4">
          {selectedConversation ? (
            <>
              <h2 className="text-xl font-semibold mb-4">
                {selectedConversation.campaignName} - {selectedConversation.otherUser}
              </h2>
              <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-4 flex ${
                      msg.sender_id === userId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg ${
                        msg.sender_id === userId
                          ? "bg-modern-primary text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      <p>{msg.message}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
                  rows="3"
                />
                <button
                  onClick={sendMessage}
                  className="bg-modern-primary text-white px-4 py-2 rounded-lg hover:bg-modern-primary-dark transition"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500">Select a conversation to start messaging.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messages;