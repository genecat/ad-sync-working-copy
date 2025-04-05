import React from "react";
import "../styles/index.css";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AuthForm from "./AuthForm";
import SignUp from "./SignUp";
import CreateListingFinal from "../components/CreateListingFinal";
import NewPublisherDashboard from "../components/NewPublisherDashboard";
import EditListing from "../components/EditListing";
import AdvertiserDashboard from "./AdvertiserDashboard";
import CreateCampaign from "./CreateCampaign";
import CampaignDashboard from "./CampaignDashboard";
import DashboardLayout from "./DashboardLayout";
import ArchivePage from "./ArchivePage.jsx";
import Messages from "./Messages";

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("");
  const [listingId, setListingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log("Fetched session on mount:", session);
        if (error) {
          console.error("Error fetching session in App.jsx:", error);
          setSession(null);
          setRole("");
          setListingId(null);
          return;
        }
        setSession(session);
        if (session) {
          console.log("Initial session user ID:", session.user.id, "Email:", session.user.email);
          await fetchUserRoleWithRetry(session.user.id);
        } else {
          console.log("No session found on mount.");
        }
      } catch (err) {
        console.error("Unexpected error fetching session in App.jsx:", err);
        setSession(null);
        setRole("");
        setListingId(null);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, "Session:", session);
      if (session) {
        console.log("Auth state changed user ID:", session.user.id, "Email:", session.user.email);
        fetchUserRoleWithRetry(session.user.id);
      } else {
        console.log("No session found in auth state change.");
        setRole("");
        setListingId(null);
      }
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserRoleWithRetry = async (userId, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt} - Fetching user role for userId: ${userId}`);
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();
        if (error) {
          console.error(`Attempt ${attempt} - Error fetching user role in App.jsx:`, error);
          throw error;
        }
        if (data) {
          console.log(`Attempt ${attempt} - Fetched user role:`, data.role);
          setRole(data.role);
          if (data.role === "publisher") {
            await fetchListingId(userId);
          }
          return;
        }
      } catch (err) {
        console.error(`Attempt ${attempt} - Failed to fetch user role:`, err);
        if (attempt === retries) {
          console.error("Max retries reached. Could not fetch user role.");
          setRole("");
          setError("Failed to fetch user role after multiple attempts. Please try logging in again.");
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const fetchListingId = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("id")
        .eq("publisher_id", userId)
        .limit(1)
        .single();
      if (error) {
        console.error("Error fetching listing id in App.jsx:", error);
        setListingId(null);
        return;
      }
      if (data) {
        console.log("Fetched listing id:", data.id);
        setListingId(data.id);
      }
    } catch (err) {
      console.error("Unexpected error fetching listing id in App.jsx:", err);
      setListingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error);
        setError(error.message);
        return;
      }
      setSession(null);
      setRole("");
      setListingId(null);
      setError(null);
    } catch (err) {
      console.error("Unexpected error during logout:", err);
      setError(err.message);
    }
  };

  const Navigation = () => (
    <nav className="bg-gray-800 p-4">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div>
          {role === "publisher" && (
            <>
              <Link to="/publisher-dashboard" className="text-white mr-4">Publisher Dashboard</Link>
              <Link to="/create-listing-final" className="text-white mr-4">Create Listing</Link>
              {listingId ? (
                <Link to={`/edit-listing/${listingId}`} className="text-white mr-4">Modify Listing</Link>
              ) : (
                <span className="text-gray-500 mr-4">Modify Listing (No listings yet)</span>
              )}
              <Link to="/messages" className="text-white mr-4">Messages</Link>
            </>
          )}
          {role === "advertiser" && (
            <>
              <Link to="/advertiser-dashboard" className="text-white mr-4">Advertiser Dashboard</Link>
              <Link to="/create-campaign" className="text-white mr-4">Create Campaign</Link>
              <Link to="/campaigns" className="text-white mr-4">Campaign Dashboard</Link>
              <Link to="/archive" className="text-white mr-4">Archive</Link>
              <Link to="/messages" className="text-white mr-4">Messages</Link>
            </>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 px-3 py-2 rounded text-white"
        >
          Logout
        </button>
      </div>
    </nav>
  );

  console.log("App render - Session:", session, "Role:", role, "Path:", window.location.pathname);

  return (
    <BrowserRouter basename="/">
      {session && <Navigation />}
      {error && (
        <div className="p-4 bg-red-100 text-red-700">
          <p>Error: {error}</p>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <div className="p-6 min-h-screen bg-white text-black">
                <h1 className="text-2xl mb-4 font-bold">Welcome to AdSync</h1>
                <p>Welcome, {session.user.email} (Role: {role || "unknown"})</p>
              </div>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/create-listing-final"
          element={
            session && role === "publisher" ? (
              <CreateListingFinal session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/edit-listing/:id"
          element={
            session && role === "publisher" ? (
              <EditListing session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/publisher-dashboard"
          element={
            session && role === "publisher" ? (
              <NewPublisherDashboard session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/advertiser-dashboard"
          element={
            session && role === "advertiser" ? (
              <AdvertiserDashboard session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/create-campaign"
          element={
            session && role === "advertiser" ? (
              <CreateCampaign session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/campaigns"
          element={
            session && role === "advertiser" ? (
              <CampaignDashboard session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/archive"
          element={
            session && (role === "advertiser" || role === "publisher") ? (
              <ArchivePage session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/messages"
          element={
            session && (role === "advertiser" || role === "publisher") ? (
              <Messages session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;