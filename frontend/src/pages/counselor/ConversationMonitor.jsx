import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { MessagesSquare, Bot, User, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ConversationMonitor = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/analytics'); // or conversation query
        // For demonstration of active sessions
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <MessagesSquare className="w-6 h-6 text-brand-600" />
          AI Autonomous Conversation Monitor
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Supervise active student chat interactions, intent classifications, and autonomous backend tool invocations
        </p>
      </div>

      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Live AI Conversation Stream Active</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The Autonomous Admissions Agent evaluates student intent in real-time, executing verified tools (`getPrograms`, `getVerificationStatus`, `checkEligibility`) without manual counselor intervention.
        </p>
        <div className="pt-2">
          <Link
            to="/counselor/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
          >
            <span>Search Student Conversations</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
