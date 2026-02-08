import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Lightbulb, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI assistant for OneServe. I can help you with complaint registration, bill payments, tracking issues, and answering questions about civic services. How can I assist you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { text: 'Register a complaint', icon: MessageCircle },
    { text: 'Check bill status', icon: Lightbulb },
    { text: 'Track my complaints', icon: MessageCircle },
    { text: 'Payment methods', icon: Lightbulb },
  ];

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('complaint') || input.includes('issue') || input.includes('problem')) {
      return 'I can help you register a complaint. Please provide:\n\n1. Brief description of the issue\n2. Category (Sanitation, Roads, Water, etc.)\n3. Location\n\nI\'ll automatically categorize it and assign priority based on the details. Would you like to proceed?';
    }
    
    if (input.includes('bill') || input.includes('payment')) {
      return 'I can assist with bill-related queries. Currently, you have:\n\n• Electricity: ₹2,450 (Due: Jan 28)\n• Water: ₹680 (Due: Jan 25)\n• Gas: ₹1,250 (Due: Jan 30)\n\nWould you like to pay any of these bills or view detailed history?';
    }
    
    if (input.includes('track') || input.includes('status')) {
      return 'You have 3 active complaints:\n\n1. #CMP1001 - Street light (In Progress)\n2. #CMP1003 - Pothole (Pending)\n3. #CMP1004 - Water leakage (In Progress)\n\nWould you like details on any specific complaint?';
    }
    
    if (input.includes('reward') || input.includes('point') || input.includes('badge')) {
      return 'Great question! You currently have 450 points and are at Level 3. You\'ve earned 8 badges so far.\n\nHere\'s how to earn more points:\n• Pay bills on time: 50 points\n• Register complaints: 25 points\n\nYou\'re just 50 points away from Level 4!';
    }
    
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return 'Hello! How can I help you with OneServe today? I can assist with complaints, bills, tracking, rewards, and general civic service queries.';
    }
    
    return 'I understand you\'re asking about "' + userInput + '". Let me help you with that.\n\nI can assist with:\n• Complaint registration and tracking\n• Bill payments and management\n• Reward points and badges\n\nCould you please provide more specific details about what you need?';
  };

  const handleQuickAction = (actionText: string) => {
    setInputText(actionText);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          AI Assistant
        </h1>
        <p className="text-gray-600">
          Get instant help with smart NLP-powered assistance and personalized recommendations
        </p>
      </div>

      {/* AI Info banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 mb-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Powered by Advanced AI</h3>
            <p className="text-indigo-100">
              Our AI assistant uses natural language processing to understand your queries and provide personalized, context-aware responses. Available 24/7 in English and Hindi.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat interface */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" style={{ height: '600px' }}>
            {/* Chat header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-full">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">OneServe AI Assistant</h3>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  Online
                </p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-lg p-4
                      ${message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                      }
                    `}
                  >
                    {message.sender === 'ai' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4" />
                        <span className="text-xs font-semibold">AI Assistant</span>
                      </div>
                    )}
                    <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
                    <p className={`text-xs mt-2 ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-gray-600" />
                      <span className="text-xs font-semibold text-gray-600">AI Assistant</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar with quick actions and tips */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.text)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-sm text-gray-700 hover:text-blue-600 flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {action.text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Capabilities */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-3">AI Capabilities</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Natural language understanding</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Smart complaint categorization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Personalized recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>24/7 multilingual support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Context-aware responses</span>
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">💡 Pro Tip</p>
            <p className="text-sm text-blue-700">
              Be specific in your queries for better assistance. For example: "I need to report a broken street light on MG Road"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
