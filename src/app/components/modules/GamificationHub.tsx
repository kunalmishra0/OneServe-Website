import { Trophy, Award, Star, Medal, Target, Zap, Users, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export function GamificationHub() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'badges' | 'leaderboard'>('overview');

  const userStats = {
    totalPoints: 450,
    level: 3,
    rank: 127,
    badgesEarned: 8,
    tasksCompleted: 15,
    nextLevelPoints: 500
  };

  const badges = [
    { id: 1, name: 'First Complaint', description: 'Registered your first complaint', icon: Star, earned: true, color: 'text-yellow-500' },
    { id: 2, name: 'Bill Payer', description: 'Paid 5 bills on time', icon: Trophy, earned: true, color: 'text-blue-500' },
    { id: 3, name: 'Community Helper', description: 'Helped resolve 3 community issues', icon: Users, earned: true, color: 'text-green-500' },
    { id: 4, name: 'Speed Demon', description: 'Resolved a complaint within 24 hours', icon: Zap, earned: true, color: 'text-purple-500' },
    { id: 5, name: 'Eco Warrior', description: 'Reduced utility usage by 10%', icon: Target, earned: true, color: 'text-emerald-500' },
    { id: 7, name: 'Social Star', description: 'Attended 5 community events', icon: Medal, earned: false, color: 'text-orange-500' },
    { id: 8, name: 'Perfect Month', description: 'All bills paid on time for a month', icon: Star, earned: true, color: 'text-indigo-500' },
    { id: 9, name: 'Feedback Pro', description: 'Submit 20 valuable feedbacks', icon: TrendingUp, earned: true, color: 'text-teal-500' },
    { id: 10, name: 'Civic Champion', description: 'Reach Level 5', icon: Trophy, earned: false, color: 'text-red-500' },
  ];

  const leaderboard = [
    { rank: 1, name: 'Priya Sharma', points: 1250, avatar: '👩' },
    { rank: 2, name: 'Amit Patel', points: 1180, avatar: '👨' },
    { rank: 3, name: 'Sneha Reddy', points: 1050, avatar: '👩' },
    { rank: 4, name: 'Rahul Kumar', points: 920, avatar: '👨' },
    { rank: 5, name: 'Anita Singh', points: 850, avatar: '👩' },
    { rank: 127, name: 'You (Rajesh Kumar)', points: 450, avatar: '👤', isUser: true }
  ];

  const recentActivities = [
    { action: 'Earned 50 points', description: 'Paid electricity bill on time', time: '2 hours ago', points: 50 },
    { action: 'New badge unlocked', description: 'Feedback Pro badge earned', time: '2 days ago', points: 100 },
    { action: 'Earned 25 points', description: 'Registered civic complaint', time: '3 days ago', points: 25 },
  ];

  const suggestedActions = [
    { title: 'Pay pending bills', description: 'Pay 2 pending bills to earn 100 points', points: 100, icon: Trophy },
    { title: 'Attend community event', description: 'Join the park cleanup drive this Sunday', points: 50, icon: Users },
  ];

  const progressPercent = (userStats.totalPoints / userStats.nextLevelPoints) * 100;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Rewards & Gamification Hub
        </h1>
        <p className="text-gray-600">
          Earn points, unlock badges, and climb the leaderboard by being an active citizen
        </p>
      </div>

      {/* User stats overview */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg p-6 md:p-8 text-white mb-8 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold mb-1">{userStats.totalPoints}</p>
            <p className="text-purple-100 text-sm">Total Points</p>
          </div>
          <div className="text-center">
            <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold mb-1">Level {userStats.level}</p>
            <p className="text-purple-100 text-sm">{userStats.nextLevelPoints - userStats.totalPoints} to next level</p>
          </div>
          <div className="text-center">
            <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold mb-1">{userStats.badgesEarned}</p>
            <p className="text-purple-100 text-sm">Badges Earned</p>
          </div>
          <div className="text-center">
            <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Medal className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold mb-1">#{userStats.rank}</p>
            <p className="text-purple-100 text-sm">Your Rank</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Level {userStats.level}</span>
            <span>Level {userStats.level + 1}</span>
          </div>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-3">
            <div 
              className="bg-white h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['overview', 'badges', 'leaderboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`
              px-4 py-2 font-semibold capitalize transition-colors
              ${selectedTab === tab 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Recent activities */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h2>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 mb-1">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      +{activity.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">AI-Suggested Actions</h2>
              <div className="space-y-3">
                {suggestedActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="bg-blue-600 p-3 rounded-lg text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 mb-1">{action.title}</p>
                        <p className="text-sm text-gray-600 mb-2">{action.description}</p>
                        <span className="text-sm font-semibold text-blue-600">+{action.points} points</span>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Start
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mini leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Top Citizens</h2>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((user) => (
                  <div key={user.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}</span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.points} points</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setSelectedTab('leaderboard')}
                className="w-full mt-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                View Full Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badges tab */}
      {selectedTab === 'badges' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Badge Collection ({badges.filter(b => b.earned).length}/{badges.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div 
                  key={badge.id}
                  className={`
                    p-4 rounded-lg border-2 text-center transition-all
                    ${badge.earned 
                      ? 'border-gray-200 bg-white shadow-sm hover:shadow-md' 
                      : 'border-gray-200 bg-gray-50 opacity-50'
                    }
                  `}
                >
                  <div className={`
                    w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center
                    ${badge.earned ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gray-300'}
                  `}>
                    <Icon className={`h-8 w-8 ${badge.earned ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">{badge.name}</h3>
                  <p className="text-xs text-gray-600">{badge.description}</p>
                  {badge.earned && (
                    <div className="mt-2 text-xs font-semibold text-green-600">✓ Earned</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard tab */}
      {selectedTab === 'leaderboard' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Community Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.map((user) => (
              <div 
                key={user.rank}
                className={`
                  flex items-center justify-between p-4 rounded-lg
                  ${user.isUser ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50'}
                `}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold
                    ${user.rank === 1 ? 'bg-yellow-500 text-white text-2xl' :
                      user.rank === 2 ? 'bg-gray-400 text-white text-2xl' :
                      user.rank === 3 ? 'bg-orange-600 text-white text-2xl' :
                      'bg-gray-200 text-gray-600'}
                  `}>
                    {user.rank <= 3 ? (user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉') : `#${user.rank}`}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${user.isUser ? 'text-blue-600' : 'text-gray-800'}`}>
                      {user.name}
                    </p>
                    <p className="text-sm text-gray-500">{user.points} points</p>
                  </div>
                </div>
                {user.rank <= 3 && (
                  <div className="text-right">
                    <Trophy className={`h-8 w-8 ${
                      user.rank === 1 ? 'text-yellow-500' :
                      user.rank === 2 ? 'text-gray-400' :
                      'text-orange-600'
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
