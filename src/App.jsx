import "./index.css"
import { supabase } from "./lib/supabaseClient"
import { useEffect, useState } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import AuthForm from "./AuthForm"
import CreateListingFinal from "./components/CreateListingFinal"
import NewPublisherDashboard from "./components/NewPublisherDashboard"
import AdvertiserDashboard from "./AdvertiserDashboard"
import CreateCampaign from "./CreateCampaign"
import CampaignDashboard from "./CampaignDashboard"
import DashboardLayout from "./DashboardLayout"
import ModifyListing from "./ModifyListing"

function Home({ session, handleLogout }) {
  const [role, setRole] = useState("")
  const [listingId, setListingId] = useState(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
        if (error) {
          console.error("Error fetching user role:", error)
        } else if (data) {
          setRole(data.role)
        }
      }
    }
    fetchUserRole()
  }, [session])

  useEffect(() => {
    const fetchListingId = async () => {
      if (role === "publisher" && session?.user?.id) {
        console.log("Role:", role)
        console.log("Session user id:", session.user.id)
        const { data, error } = await supabase
          .from("listings")
          .select("id")
          .eq("publisher_id", session.user.id)
          .limit(1)
          .single()
        if (error) {
          console.error("Error fetching listing id:", error)
        } else if (data) {
          console.log("Fetched listing id:", data.id)
          setListingId(data.id)
        }
      }
    }
    fetchListingId()
  }, [role, session])

  return (
    <div className="p-6 min-h-screen bg-white text-black">
      <h1 className="text-2xl mb-4 font-bold">Welcome to AdSync</h1>
      <p>
        Welcome, {session.user.email} (Role: {role || "unknown"})
      </p>
      <nav className="my-4">
        {role === "publisher" && (
          <>
            <a href="/publisher-dashboard" className="underline mr-4">
              Publisher Dashboard
            </a>
            <div>
              <a href="/create-listing" className="underline mr-4">
                Create Listing
              </a>
              {listingId && (
                <div className="ml-4 mt-1">
                  <a
                    href={`/modify-listing/${listingId}`}
                    className="underline"
                  >
                    Modify Listing
                  </a>
                </div>
              )}
            </div>
          </>
        )}
        {role === "advertiser" && (
          <>
            <a href="/advertiser-dashboard" className="underline mr-4">
              Advertiser Dashboard
            </a>
            <a href="/create-campaign" className="underline mr-4">
              Create Campaign
            </a>
            <a href="/campaigns" className="underline">
              Campaign Dashboard
            </a>
          </>
        )}
      </nav>
      <button
        onClick={handleLogout}
        className="bg-red-500 px-3 py-2 rounded text-white mt-4"
      >
        Logout
      </button>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
      }
    )

    return () => authListener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setError(error.message)
    } else {
      setSession(null)
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <DashboardLayout user={session.user} onLogout={handleLogout}>
                <Home session={session} handleLogout={handleLogout} />
              </DashboardLayout>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/create-listing"
          element={
            session ? (
              <DashboardLayout user={session.user} onLogout={handleLogout}>
                <CreateListingFinal session={session} />
              </DashboardLayout>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/modify-listing/:listingId"
          element={
            session ? (
              <DashboardLayout user={session.user} onLogout={handleLogout}>
                <ModifyListing session={session} />
              </DashboardLayout>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/publisher-dashboard"
          element={
            session ? (
              <DashboardLayout user={session.user} onLogout={handleLogout}>
                <NewPublisherDashboard session={session} />
              </DashboardLayout>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/advertiser-dashboard"
          element={
            session ? (
              <DashboardLayout user={session.user} onLogout={handleLogout}>
                <AdvertiserDashboard session={session} />
              </DashboardLayout>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/create-campaign"
          element={
            session ? (
              <DashboardLayout user={session.user} onLogout={handleLogout}>
                <CreateCampaign session={session} />
              </DashboardLayout>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/campaigns"
          element={
            session ? (
              <DashboardLayout user={session.user} onLogout={handleLogout}>
                <CampaignDashboard session={session} />
              </DashboardLayout>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App







