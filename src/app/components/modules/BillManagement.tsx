import { useState } from 'react';
import { Zap, Droplet, Flame, Calendar, Bell, Download, TrendingDown, TrendingUp } from 'lucide-react';

export function BillManagement() {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  const billHistory = [
    { month: 'Jan 2026', electricity: 2450, water: 680, gas: 1250, status: 'pending' },
    { month: 'Dec 2025', electricity: 2280, water: 650, gas: 1180, status: 'paid' },
    { month: 'Nov 2025', electricity: 2150, water: 630, gas: 1100, status: 'paid' },
    { month: 'Oct 2025', electricity: 2380, water: 670, gas: 1220, status: 'paid' },
    { month: 'Sep 2025', electricity: 2550, water: 690, gas: 1280, status: 'paid' },
    { month: 'Aug 2025', electricity: 2600, water: 700, gas: 1300, status: 'paid' },
  ];

  const upcomingDueDates = [
    { type: 'Water', date: '2026-01-25', amount: 680, icon: Droplet, color: 'text-blue-600' },
    { type: 'Electricity', date: '2026-01-28', amount: 2450, icon: Zap, color: 'text-yellow-600' },
    { type: 'Gas', date: '2026-01-30', amount: 1250, icon: Flame, color: 'text-orange-600' },
  ];

  const totalPending = upcomingDueDates.reduce((sum, bill) => sum + bill.amount, 0);
  const avgMonthly = Math.round(billHistory.slice(1).reduce((sum, month) => 
    sum + month.electricity + month.water + month.gas, 0) / 5);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Bill Management Dashboard
        </h1>
        <p className="text-gray-600">
          Track, analyze, and manage all your utility bills in one place
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 shadow-sm border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-red-700 font-medium">Total Pending</p>
            <Bell className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-800">₹{totalPending.toLocaleString('en-IN')}</p>
          <p className="text-xs text-red-600 mt-1">3 bills due this month</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-sm border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Avg Monthly</p>
            <TrendingDown className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-800">₹{avgMonthly.toLocaleString('en-IN')}</p>
          <p className="text-xs text-green-600 mt-1">5% lower than last month</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">This Month</p>
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-800">₹{billHistory[0].electricity + billHistory[0].water + billHistory[0].gas}</p>
          <p className="text-xs text-blue-600 mt-1">January 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill history */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Bill History</h2>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="12months">Last 12 Months</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Month</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-end gap-1">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        Electricity
                      </div>
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-end gap-1">
                        <Droplet className="h-4 w-4 text-blue-600" />
                        Water
                      </div>
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-end gap-1">
                        <Flame className="h-4 w-4 text-orange-600" />
                        Gas
                      </div>
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Total</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billHistory.map((bill, index) => {
                    const total = bill.electricity + bill.water + bill.gas;
                    const prevTotal = index < billHistory.length - 1 
                      ? billHistory[index + 1].electricity + billHistory[index + 1].water + billHistory[index + 1].gas 
                      : total;
                    const change = ((total - prevTotal) / prevTotal) * 100;
                    
                    return (
                      <tr key={bill.month} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-sm font-medium text-gray-800">{bill.month}</td>
                        <td className="py-3 px-2 text-sm text-right text-gray-700">₹{bill.electricity}</td>
                        <td className="py-3 px-2 text-sm text-right text-gray-700">₹{bill.water}</td>
                        <td className="py-3 px-2 text-sm text-right text-gray-700">₹{bill.gas}</td>
                        <td className="py-3 px-2 text-sm text-right font-semibold text-gray-800">
                          <div className="flex items-center justify-end gap-1">
                            ₹{total}
                            {index > 0 && (
                              change > 0 ? (
                                <TrendingUp className="h-3 w-3 text-red-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-green-500" />
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`
                            inline-block px-2 py-1 rounded text-xs font-semibold
                            ${bill.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                            }
                          `}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button className="mt-4 w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              <Download className="h-4 w-4" />
              Download Full History
            </button>
          </div>
        </div>

        {/* Upcoming dues and alerts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upcoming due dates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Upcoming Due Dates
            </h2>
            <div className="space-y-3">
              {upcomingDueDates.map((bill) => {
                const Icon = bill.icon;
                const daysUntilDue = Math.ceil(
                  (new Date(bill.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div key={bill.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${bill.color}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{bill.type}</p>
                        <p className="text-xs text-gray-500">
                          {daysUntilDue} days left
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">₹{bill.amount}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(bill.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-600" />
              Alerts & Reminders
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800 mb-1">Water Bill Due Soon</p>
                <p className="text-xs text-red-600">Due in 2 days - January 25</p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800 mb-1">Electricity Bill Reminder</p>
                <p className="text-xs text-yellow-600">Due in 5 days - January 28</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 mb-1">Usage Alert</p>
                <p className="text-xs text-blue-600">Electricity usage up 7% this month</p>
              </div>
            </div>
          </div>

          {/* Auto-pay setup */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-2">Enable Auto-Pay</h3>
            <p className="text-sm text-gray-600 mb-4">
              Never miss a due date. Set up automatic payments for your bills.
            </p>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
              Setup Auto-Pay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
