import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  User,
  AlertCircle,
  Minimize2,
  Maximize2,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

export const FloatingAiAssistant = () => {
  const { user, student, isStudent } = useAuth();
  const { socket } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (student?._id) {
      const fetchHistory = async () => {
        try {
          const res = await api.get(`/ai/conversations?studentId=${student._id}`);
          if (res.data.success && res.data.data.messages) {
            setMessages(res.data.data.messages);
            if (res.data.data.conversation?._id) {
              setConversationId(res.data.data.conversation._id);
            }
          }
        } catch (e) {
          // New conversation
        }
      };
      fetchHistory();
    }
  }, [student?._id]);

  // Real-time socket chat message listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data?.message) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
      }
    };

    socket.on('chat:message', handleNewMessage);
    return () => socket.off('chat:message', handleNewMessage);
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    // Optimistic student message
    const tempStudentMsg = {
      _id: `temp-${Date.now()}`,
      sender: 'STUDENT',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempStudentMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: text,
        conversationId,
      });

      if (response.data.success) {
        const { aiMessage, conversationId: convId } = response.data.data;
        if (convId) setConversationId(convId);
        setMessages((prev) => [...prev.filter((m) => m._id !== tempStudentMsg._id), response.data.data.userMessage, aiMessage]);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          _id: `err-${Date.now()}`,
          sender: 'SYSTEM',
          content: 'Sorry, I encountered an issue connecting with the AI engine. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'What is the CSE fee?',
    'Are all my documents verified?',
    'I want to apply for a fee waiver',
    'What is my official enrollment status?',
  ];

  // Only display for student role or visitors
  if (user && !isStudent) return null;

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-tr from-brand-700 via-brand-600 to-brand-500 text-white font-bold shadow-xl shadow-brand-500/30 hover:scale-105 hover:shadow-brand-500/40 transition-all group"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
          </div>
          <span className="text-xs font-semibold tracking-wide">AI Admissions Agent</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? 'h-14' : 'h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-slate-900 to-brand-950 text-white select-none">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/30 border border-brand-400/30 text-brand-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight">Autonomous Admissions AI</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-300 font-medium">Real-time Backend Tools Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:text-white rounded hover:bg-white/10"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:text-white rounded hover:bg-white/10"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
                {messages.length === 0 && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Bot className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">How can I assist your admission?</h4>
                    <p className="text-[11px] text-slate-500">
                      I can answer fee questions, check document verification, trigger eligibility checks, or escalate special cases to counselors.
                    </p>
                  </div>
                )}

                {messages.map((m) => {
                  const isAi = m.sender === 'AI';
                  const isSystem = m.sender === 'SYSTEM';
                  const isStudentMsg = m.sender === 'STUDENT';

                  return (
                    <div
                      key={m._id || Math.random()}
                      className={`flex gap-2 text-xs ${
                        isStudentMsg ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!isStudentMsg && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 space-y-1.5 shadow-sm ${
                          isStudentMsg
                            ? 'bg-brand-600 text-white rounded-br-none'
                            : isSystem
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line leading-relaxed text-[12px]">
                          {m.content}
                        </p>

                        {/* Tool execution badge if present */}
                        {m.toolCalls && m.toolCalls.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1 border-t border-slate-100 mt-1">
                            {m.toolCalls.map((tc, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-mono text-slate-600 border border-slate-200"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-brand-600" />
                                {tc.toolName}()
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {isStudentMsg && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex gap-2 items-center text-xs text-slate-500">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                      <Bot className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[11px] font-medium text-slate-500 ml-1">Executing backend tool...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Prompt Chips */}
              <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-[10px] font-medium text-slate-600 border border-slate-200/80 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Chat Input Field */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question or request counselor escalation..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-brand-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
