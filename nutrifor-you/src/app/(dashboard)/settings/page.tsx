import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/settings/subscription"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900">Subscription & Plans</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your subscription tier, billing cycle, and payment methods.
          </p>
        </Link>

        <Link
          href="/settings/privacy"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900">Privacy & Data</h2>
          <p className="text-sm text-gray-500 mt-1">
            Consent preferences, data export, and account deletion.
          </p>
        </Link>

        <Link
          href="/settings/branding"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900">Branding & Customization</h2>
          <p className="text-sm text-gray-500 mt-1">
            Clinic logo, colors, and organization details.
          </p>
        </Link>

        <Link
          href="/settings/integrations"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Connect Google Calendar, WhatsApp, Stripe, and more.
          </p>
        </Link>
      </div>
    </div>
  )
}
