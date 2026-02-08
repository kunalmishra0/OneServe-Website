import { User, Bell, Lock, Globe, Palette, Accessibility, Shield, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function Settings() {
  const [language, setLanguage] = useState('english');
  const [notifications, setNotifications] = useState({
    emergency: true,
    complaints: true,
    bills: true,
    rewards: false
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Settings & Preferences
        </h1>
        <p className="text-gray-600">
          Manage your account, privacy, notifications, and accessibility preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Profile Settings</h2>
              <p className="text-sm text-gray-600">Manage your personal information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                defaultValue="Rajesh Kumar"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                defaultValue="rajesh.kumar@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                defaultValue="+91 98765 43210"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
              <textarea
                defaultValue="123, MG Road, Andheri West, Mumbai - 400058"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Save Changes
            </button>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-2 rounded-lg">
              <Globe className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Language & Region</h2>
              <p className="text-sm text-gray-600">Choose your preferred language</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="language"
                  value="english"
                  checked={language === 'english'}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="font-semibold text-gray-800">English</p>
                  <p className="text-sm text-gray-600">Default language</p>
                </div>
              </div>
              {language === 'english' && (
                <span className="text-blue-600 font-semibold">Active</span>
              )}
            </label>

            <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="language"
                  value="hindi"
                  checked={language === 'hindi'}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="font-semibold text-gray-800">हिंदी (Hindi)</p>
                  <p className="text-sm text-gray-600">Hindi language</p>
                </div>
              </div>
              {language === 'hindi' && (
                <span className="text-blue-600 font-semibold">Active</span>
              )}
            </label>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Bell className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Notification Preferences</h2>
              <p className="text-sm text-gray-600">Control what notifications you receive</p>
            </div>
          </div>

                      <div className="space-y-4">
                      {[
                        { key: 'emergency', label: 'Emergency Alerts', description: 'Critical announcements and safety alerts' },
                        { key: 'complaints', label: 'Complaint Updates', description: 'Status updates on your complaints' },
                        { key: 'bills', label: 'Bill Reminders', description: 'Payment due dates and reminders' },
                        { key: 'rewards', label: 'Rewards & Achievements', description: 'Points, badges, and leaderboard updates' }
                      ].map((item) => (              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.label}</p>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <label className="relative inline-block w-12 h-6 ml-4">
                  <input
                    type="checkbox"
                    checked={notifications[item.key as keyof typeof notifications]}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      [item.key]: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Accessibility Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Accessibility className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Accessibility</h2>
              <p className="text-sm text-gray-600">Customize your experience</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-800">High Contrast Mode</p>
                <p className="text-sm text-gray-600">Improve text readability</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-800">Large Text</p>
                <p className="text-sm text-gray-600">Increase font size</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-800">Screen Reader Support</p>
                <p className="text-sm text-gray-600">Enable screen reader optimization</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-100 p-2 rounded-lg">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Security & Privacy</h2>
              <p className="text-sm text-gray-600">Manage your account security</p>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div>
                <p className="font-semibold text-gray-800">Change Password</p>
                <p className="text-sm text-gray-600">Update your account password</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div>
                <p className="font-semibold text-gray-800">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div>
                <p className="font-semibold text-gray-800">Privacy Settings</p>
                <p className="text-sm text-gray-600">Control your data and privacy</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div>
                <p className="font-semibold text-gray-800">Connected Accounts</p>
                <p className="text-sm text-gray-600">Manage linked accounts</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Palette className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Appearance</h2>
              <p className="text-sm text-gray-600">Customize the look and feel</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
              <div className="bg-white rounded-lg p-3 mb-2 shadow-sm">
                <div className="h-2 bg-gray-200 rounded mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              </div>
              <p className="text-sm font-semibold text-gray-800">Light</p>
            </button>
            <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-gray-400">
              <div className="bg-gray-800 rounded-lg p-3 mb-2 shadow-sm">
                <div className="h-2 bg-gray-600 rounded mb-1"></div>
                <div className="h-2 bg-gray-600 rounded w-3/4"></div>
              </div>
              <p className="text-sm font-semibold text-gray-800">Dark</p>
            </button>
            <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-gray-400">
              <div className="bg-gradient-to-br from-gray-100 to-gray-800 rounded-lg p-3 mb-2 shadow-sm">
                <div className="h-2 bg-gray-400 rounded mb-1"></div>
                <div className="h-2 bg-gray-400 rounded w-3/4"></div>
              </div>
              <p className="text-sm font-semibold text-gray-800">Auto</p>
            </button>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Your Data is Protected</h3>
              <p className="text-sm text-blue-800 mb-4">
                We use industry-standard encryption and security measures to protect your personal information. 
                Your data is never shared with third parties without your explicit consent.
              </p>
              <button className="text-sm text-blue-600 font-semibold hover:text-blue-700">
                Read our Privacy Policy →
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-4">Danger Zone</h3>
          <div className="space-y-3">
            <button className="w-full p-4 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-left">
              <p className="font-semibold text-red-800">Deactivate Account</p>
              <p className="text-sm text-red-600">Temporarily disable your account</p>
            </button>
            <button className="w-full p-4 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-left">
              <p className="font-semibold text-red-800">Delete Account</p>
              <p className="text-sm text-red-600">Permanently delete your account and data</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
