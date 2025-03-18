import { Link } from 'react-router-dom';
import { ArrowRight, Plug, Handshake, ChartPie, BarChart, Code, Search, Target, Gauge } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-bg text-text-light">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Grow Your Revenue. Expand Your Reach.
          </h1>
          <p className="text-lg md:text-xl text-text-muted mb-8">
            Ad-Sync connects publishers with advertisers to maximize earnings and minimize costs. No middlemen—just you, your audience, and the ads that fit your niche.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center bg-accent-green text-dark-bg font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition"
            >
              Sign Up
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center bg-accent-purple text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Ad-Sync Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12">
            Why Choose Ad-Sync?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-dark-gray p-6 rounded-lg shadow-card">
              <Plug className="h-8 w-8 mb-4 text-accent-green" />
              <h3 className="text-xl font-semibold mb-3">For Publishers</h3>
              <p className="text-text-muted">
                Monetize your ad spaces by creating listings and connecting with advertisers looking for your audience.
              </p>
            </div>
            <div className="bg-dark-gray p-6 rounded-lg shadow-card">
              <Handshake className="h-8 w-8 mb-4 text-accent-green" />
              <h3 className="text-xl font-semibold mb-3">For Advertisers</h3>
              <p className="text-text-muted">
                Reach your target audience by creating and managing ad campaigns with ease.
              </p>
            </div>
            <div className="bg-dark-gray p-6 rounded-lg shadow-card">
              <ChartPie className="h-8 w-8 mb-4 text-accent-green" />
              <h3 className="text-xl font-semibold mb-3">Seamless Integration</h3>
              <p className="text-text-muted">
                Our platform makes it simple to manage campaigns, track performance, and connect with partners.
              </p>
            </div>
            <div className="bg-dark-gray p-6 rounded-lg shadow-card">
              <BarChart className="h-8 w-8 mb-4 text-accent-green" />
              <h3 className="text-xl font-semibold mb-3">Comprehensive Analytics</h3>
              <p className="text-text-muted">
                Track clicks, impressions, and earnings in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <Code className="h-12 w-12 mx-auto mb-4 text-accent-green" />
              <h3 className="text-xl font-semibold mb-3">List Your Website</h3>
              <p className="text-text-muted">
                Publishers list their sites & set up ad containers.
              </p>
            </div>
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-accent-green" />
              <h3 className="text-xl font-semibold mb-3">Find the Perfect Match</h3>
              <p className="text-text-muted">
                Advertisers search by category to find the right websites.
              </p>
            </div>
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-accent-green" />
              <h3 className="text-xl font-semibold mb-3">Place Your Ads</h3>
              <p className="text-text-muted">
                Advertisers set their budgets and launch campaigns.
              </p>
            </div>
            <div className="text-center">
              <Gauge className="h-12 w-12 mx-auto mb-4 text-accent-green" />
              <h3 className="text-xl font-semibold mb-3">Monitor & Optimize</h3>
              <p className="text-text-muted">
                Use detailed analytics to track and improve performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans & Pricing Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
            Plans & Pricing
          </h2>
          <p className="text-center text-text-muted mb-12">
            Choose the best plan for your needs. Publishers start free and keep 80% of PPC revenue. Advertisers can test for free, then upgrade as their needs grow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-dark-gray p-6 rounded-lg shadow-card text-center">
              <h3 className="text-xl font-semibold mb-3">Publishers - Free Tier</h3>
              <p className="text-2xl font-bold text-accent-green mb-4">0% Monthly Fee</p>
              <p className="text-text-muted mb-4">80% Revenue Share<br />Unlimited Containers<br />Basic Analytics</p>
              <Link
                to="/auth"
                className="inline-flex items-center bg-accent-green text-dark-bg font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition"
              >
                Get Started
              </Link>
            </div>
            <div className="bg-dark-gray p-6 rounded-lg shadow-card text-center">
              <h3 className="text-xl font-semibold mb-3">Advertisers - Free Tier</h3>
              <p className="text-2xl font-bold text-accent-green mb-4">$0 / Month</p>
              <p className="text-text-muted mb-4">Run 1-2 Campaigns<br />Pay Per Click/Ad Spend<br />Basic Analytics</p>
              <Link
                to="/auth"
                className="inline-flex items-center bg-accent-green text-dark-bg font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition"
              >
                Start Now
              </Link>
            </div>
            <div className="bg-dark-gray p-6 rounded-lg shadow-card text-center">
              <h3 className="text-xl font-semibold mb-3">Advertisers - Premium Tier</h3>
              <p className="text-2xl font-bold text-accent-purple mb-4">$5 / Month</p>
              <p className="text-text-muted mb-4">5-10 Campaigns Included<br />Additional Fee Per Extra Campaign<br />Advanced Analytics & Support</p>
              <Link
                to="/auth"
                className="inline-flex items-center bg-accent-purple text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-gray py-6">
        <div className="container mx-auto px-6 text-center">
          <p className="text-text-muted mb-2">© 2025 Ad-Sync. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <a href="#" className="text-text-muted hover:text-accent-green">About</a>
            <a href="#" className="text-text-muted hover:text-accent-green">Contact</a>
            <a href="#" className="text-text-muted hover:text-accent-green">Terms of Service</a>
            <a href="#" className="text-text-muted hover:text-accent-green">Privacy Policy</a>
            <a href="#" className="text-text-muted hover:text-accent-green">Blog</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
