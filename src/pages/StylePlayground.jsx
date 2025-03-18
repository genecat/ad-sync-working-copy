import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

function StylePlayground() {
  return (
    <div className="min-h-screen bg-modern-bg text-modern-text p-6">
      <h1 className="text-4xl font-heading font-bold mb-6 text-center">
        Style Playground for Ad-Sync
      </h1>
      <p className="text-modern-muted mb-8 text-center">
        Testing the modern theme inspired by the new landing page design.
      </p>

      {/* Hero Section Sample */}
      <section className="mb-12">
        <h2 className="text-3xl font-heading font-bold mb-4 text-center">
          Ad Exchange Platform
        </h2>
        <p className="text-modern-muted mb-6 text-center">
          Connecting publishers and advertisers seamlessly in one place
        </p>
      </section>

      {/* For Publishers and For Advertisers Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* For Publishers */}
        <div className="bg-modern-card p-6 rounded-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <Check className="h-6 w-6 text-modern-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold">For Publishers</h3>
          </div>
          <h4 className="text-lg font-semibold mb-4">Maximize your ad revenue potential</h4>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="h-5 w-5 text-modern-primary mr-2" />
              <span>Access premium advertisers</span>
            </li>
            <li className="flex items-center">
              <Check className="h-5 w-5 text-modern-primary mr-2" />
              <span>Real-time performance analytics</span>
            </li>
            <li className="flex items-center">
              <Check className="h-5 w-5 text-modern-primary mr-2" />
              <span>Flexible payment options</span>
            </li>
          </ul>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center bg-modern-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition"
          >
            Join as Publisher
          </Link>
        </div>

        {/* For Advertisers */}
        <div className="bg-modern-card p-6 rounded-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-2 rounded-full mr-3">
              <Check className="h-6 w-6 text-modern-secondary" />
            </div>
            <h3 className="text-xl font-heading font-semibold">For Advertisers</h3>
          </div>
          <h4 className="text-lg font-semibold mb-4">Reach your perfect audience</h4>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="h-5 w-5 text-modern-secondary mr-2" />
              <span>Target specific demographics</span>
            </li>
            <li className="flex items-center">
              <Check className="h-5 w-5 text-modern-secondary mr-2" />
              <span>Advanced campaign management</span>
            </li>
            <li className="flex items-center">
              <Check className="h-5 w-5 text-modern-secondary mr-2" />
              <span>Detailed conversion tracking</span>
            </li>
          </ul>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center bg-modern-secondary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition"
          >
            Join as Advertiser
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section>
        <h2 className="text-2xl font-heading font-bold mb-4 text-center">How It Works</h2>
        <p className="text-modern-muted text-center">
          (This section can be expanded with steps or visuals as needed.)
        </p>
      </section>
    </div>
  );
}

export default StylePlayground;
