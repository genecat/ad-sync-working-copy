import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import AdvertiserDashboard from './pages/AdvertiserDashboard';
import CreateCampaign from './pages/CreateCampaign';
import CreateListingFinal from './components/CreateListingFinal';
import ModifyListing from './pages/ModifyListing';
import NewPublisherDashboard from './components/NewPublisherDashboard';
import Login from './pages/AuthForm';
import './styles/App.css';

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session);
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state change:", _event, "session:", session);
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (session && userRole) {
      navigate(userRole === 'publisher' ? '/publisher-dashboard' : '/advertiser-dashboard');
    }
  }, [session, userRole, navigate]);

  const fetchUserRole = async (userId) => {
    console.log("Fetching role for userId:", userId);
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (error) {
      console.error("Error fetching user role:", error);
    } else if (!data) {
      console.log("No role found for userId:", userId);
    } else {
      setUserRole(data.role);
      console.log("User role fetched:", data.role);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
    navigate('/login');
  };

  console.log("Current session:", session, "Role:", userRole);

  return (
    <div className="App">
      {session && (
        <nav className="bg-gray-800 p-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div>
              {userRole === 'advertiser' && (
                <>
                  <Link to="/advertiser-dashboard" className="text-white mr-4">Advertiser Dashboard</Link>
                  <Link to="/create-campaign" className="text-white mr-4">Create Campaign</Link>
                </>
              )}
              {userRole === 'publisher' && (
                <>
                  <Link to="/publisher-dashboard" className="text-white mr-4">Publisher Dashboard</Link>
                  <Link to="/create-listing-final" className="text-white mr-4">Create Listing</Link>
                  <Link to="/modify-listing" className="text-white">Modify Listing</Link>
                </>
              )}
            </div>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded">
              Logout
            </button>
          </div>
        </nav>
      )}
      <Routes>
        <Route path="/" element={<div>Home Placeholder</div>} />
        <Route path="/login" element={<Login session={session} setSession={setSession} />} />
        <Route
          path="/advertiser-dashboard"
          element={session ? <AdvertiserDashboard session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/publisher-dashboard"
          element={session ? <NewPublisherDashboard session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/create-campaign"
          element={session && userRole === 'advertiser' ? <CreateCampaign session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/create-listing-final"
          element={
            (() => {
              console.log("Access check for /create-listing-final:", { session, userRole });
              return session && userRole === 'publisher' ? <CreateListingFinal session={session} /> : <Navigate to="/login" />;
            })()
          }
        />
        <Route
          path="/modify-listing"
          element={
            (() => {
              console.log("Access check for /modify-listing:", { session, userRole });
              return session && userRole === 'publisher' ? <ModifyListing session={session} /> : <Navigate to="/login" />;
            })()
          }
        />
      </Routes>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}