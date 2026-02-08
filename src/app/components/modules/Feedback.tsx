import { MessageCircle, Star, Send, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

export function Feedback() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const categories = [
    'App Performance',
    'User Interface',
    'Complaint System',
    'Bill Payment',
    'AI Assistant',
    'Notifications',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setRating(0);
      setFeedbackText('');
      setCategory('');
    }, 3000);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Share Your Feedback
        </h1>
        <p className="text-gray-600">
          Help us improve OneServe by sharing your experience and suggestions
        </p>
      </div>

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <ThumbsUp className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm text-green-900 font-medium">Thank you for your feedback!</p>
            <p className="text-sm text-green-700">Your input helps us make OneServe better for everyone.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                How would you rate your experience? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {rating === 5 && 'Excellent! 🎉'}
                  {rating === 4 && 'Great! 👍'}
                  {rating === 3 && 'Good 👌'}
                  {rating === 2 && 'Fair 😐'}
                  {rating === 1 && 'Needs improvement 😔'}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Feedback Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Feedback text */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us what you think... Share your experience, suggestions, or report any issues."
                rows={6}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                {feedbackText.length} / 1000 characters
              </p>
            </div>

            {/* Contact checkbox */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  I would like the OneServe team to contact me regarding my feedback
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!rating || !category || !feedbackText}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
              Submit Feedback
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Why feedback matters */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-3">Why Your Feedback Matters</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Helps us improve app features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Identifies and fixes bugs faster</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Shapes future development</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Improves civic services</span>
              </li>
            </ul>
          </div>

          {/* Recent improvements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Improvements</h3>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-900 mb-1">✓ AI Assistant Enhanced</p>
                <p className="text-xs text-green-700">Based on user feedback</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-900 mb-1">✓ Faster Bill Payments</p>
                <p className="text-xs text-green-700">Requested by 150+ users</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-900 mb-1">✓ Hindi Language Support</p>
                <p className="text-xs text-green-700">Most requested feature</p>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Need Immediate Help?</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>📧 support@oneserve.in</p>
              <p>📞 1800-123-4567</p>
              <p>🕒 Mon-Sat, 9 AM - 6 PM IST</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Community Impact</h3>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold text-purple-600">2,500+</p>
                <p className="text-sm text-gray-700">Feedback submissions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">87%</p>
                <p className="text-sm text-gray-700">User satisfaction rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">150+</p>
                <p className="text-sm text-gray-700">Improvements made</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Common topics */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Popular Feedback Topics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'Faster Loading',
            'More Languages',
            'Dark Mode',
            'Offline Mode',
            'Better Search',
            'Mobile App',
            'Email Notifications',
            'Export Data'
          ].map((topic) => (
            <button
              key={topic}
              onClick={() => setFeedbackText(feedbackText + `Regarding ${topic}: `)}
              className="p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-sm text-gray-700 hover:text-blue-600 transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
