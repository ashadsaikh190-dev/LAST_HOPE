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
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Code2,
  HelpCircle,
  ChevronRight,
  Calculator,
  GraduationCap,
  FileCheck2,
  TrendingUp,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

// Helper component to render formatted Markdown text, code blocks, and lists cleanly
const FormattedMessage = ({ content }) => {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!content) return null;

  // Split by code blocks ```...```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let blockIndex = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: content.substring(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'text',
      code: match[2].trim(),
      idx: blockIndex++,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      text: content.substring(lastIndex),
    });
  }

  const renderInlineFormatted = (rawText) => {
    const lines = rawText.split('\n');
    return lines.map((line, lIdx) => {
      // Heading level 3 or bold heading
      if (line.startsWith('### ') || line.startsWith('## ')) {
        const headingText = line.replace(/^#{2,3}\s+/, '');
        return (
          <h4 key={lIdx} className="font-bold text-slate-900 text-[13px] mt-2 mb-1">
            {headingText}
          </h4>
        );
      }

      // Bullet points
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().replace(/^[•\-\*]\s+/, '') : line;

      // Inline Bold and Code regex
      const formattedParts = [];
      const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g;
      let inLast = 0;
      let inMatch;

      while ((inMatch = inlineRegex.exec(cleanLine)) !== null) {
        if (inMatch.index > inLast) {
          formattedParts.push(cleanLine.substring(inLast, inMatch.index));
        }
        const token = inMatch[0];
        if (token.startsWith('**') && token.endsWith('**')) {
          formattedParts.push(
            <strong key={inMatch.index} className="font-semibold text-slate-900">
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith('`') && token.endsWith('`')) {
          formattedParts.push(
            <code
              key={inMatch.index}
              className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-brand-700 font-medium"
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        inLast = inMatch.index + token.length;
      }
      if (inLast < cleanLine.length) {
        formattedParts.push(cleanLine.substring(inLast));
      }

      if (isBullet) {
        return (
          <div key={lIdx} className="flex items-start gap-2 my-0.5 pl-1">
            <span className="text-brand-500 font-bold leading-relaxed text-[12px]">•</span>
            <span className="flex-1 leading-relaxed text-[12px] text-slate-700">{formattedParts}</span>
          </div>
        );
      }

      if (!cleanLine.trim()) {
        return <div key={lIdx} className="h-1.5" />;
      }

      return (
        <p key={lIdx} className="leading-relaxed text-[12px] text-slate-700">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="space-y-1 text-slate-800">
      {parts.map((part, pIdx) => {
        if (part.type === 'code') {
          return (
            <div key={pIdx} className="my-2 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 text-[10px] text-slate-400 font-mono border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Code2 className="w-3 h-3 text-brand-400" />
                  {part.language || 'code'}
                </span>
                <button
                  onClick={() => copyCode(part.code, part.idx)}
                  className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 transition-all text-[10px]"
                >
                  {copiedIdx === part.idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[11px] font-mono text-emerald-300/90 leading-relaxed scrollbar-thin">
                <code>{part.code}</code>
              </pre>
            </div>
          );
        }
        return <div key={pIdx}>{renderInlineFormatted(part.text)}</div>;
      })}
    </div>
  );
};

export const FloatingAiAssistant = () => {
  const { user, student, isStudent } = useAuth();
  const { socket } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const trackingId = student?.trackingId || 'PROSPECT-VISITOR';

  // Load chat history for authenticated student, or load cached session messages for guests
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
          // New conversation for student
        }
      };
      fetchHistory();
    } else {
      const savedGuestChat = sessionStorage.getItem('guest_ai_chat');
      if (savedGuestChat) {
        try {
          setMessages(JSON.parse(savedGuestChat));
        } catch (e) {}
      }
    }
  }, [student?._id]);

  // Real-time socket chat message listener for authenticated students
  useEffect(() => {
    if (!socket || !student) return;

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
  }, [socket, student]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!student?._id && messages.length > 0) {
      sessionStorage.setItem('guest_ai_chat', JSON.stringify(messages.slice(-20)));
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

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
      if (student?._id) {
        // Authenticated student endpoint
        const response = await api.post('/ai/chat', {
          message: text,
          conversationId,
        });

        if (response.data.success) {
          const { aiMessage, conversationId: convId } = response.data.data;
          if (convId) setConversationId(convId);
          setMessages((prev) => [
            ...prev.filter((m) => m._id !== tempStudentMsg._id),
            response.data.data.userMessage,
            aiMessage,
          ]);
        }
      } else {
        // Public guest endpoint
        const historyPayload = messages.slice(-6).map((m) => ({
          role: m.sender === 'STUDENT' ? 'user' : 'assistant',
          content: m.content,
        }));

        const response = await api.post('/ai/public-chat', {
          message: text,
          trackingId: 'PROSPECT-VISITOR',
          history: historyPayload,
        });

        if (response.data.success) {
          const { aiMessage } = response.data.data;
          setMessages((prev) => [
            ...prev.filter((m) => m._id !== tempStudentMsg._id),
            tempStudentMsg,
            aiMessage,
          ]);
        }
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          _id: `err-${Date.now()}`,
          sender: 'SYSTEM',
          content: '⚠️ I encountered an issue reaching the AI engine. Please ensure the backend and AI agent service are running.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    sessionStorage.removeItem('guest_ai_chat');
  };

  const quickPrompts = [
    { label: '💰 B.Tech CSE Fees', text: 'What is the fee for B.Tech CSE?' },
    { label: '🏆 University Rankings', text: 'Tell me about the university NIRF ranking and accreditations.' },
    { label: '💼 Placement Packages', text: 'What is the highest and average placement salary package?' },
    { label: '📄 Document Status', text: 'Are all my documents verified?' },
    { label: '🤝 Fee Waiver Escalation', text: 'I would like to apply for a fee waiver or scholarship exception.' },
    { label: '💻 Coding / General AI', text: 'Explain how machine learning works in 3 bullet points with an example.' },
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-600 text-white font-bold shadow-2xl shadow-brand-600/30 hover:scale-105 hover:shadow-brand-600/50 transition-all duration-200 group border border-white/20"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-brand-700 animate-pulse" />
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold leading-none tracking-wide">AI Assistant</span>
            <span className="text-[10px] text-brand-200 font-normal leading-none">ChatGPT Intelligence Active</span>
          </div>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 flex flex-col overflow-hidden transition-all duration-300 animate-fade-in ${
            isExpanded
              ? 'w-[95vw] sm:w-[620px] h-[82vh] max-h-[750px]'
              : 'w-[92vw] sm:w-[430px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-950 text-white select-none border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/30 border border-brand-500/40 text-brand-300 shadow-inner">
                <Sparkles className="w-4 h-4 text-brand-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-tight">Autonomous AI Assistant</h3>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold border border-emerald-500/30">
                    GPT-4o
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-300 font-medium truncate max-w-[200px]">
                    ID: {trackingId}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <button
                onClick={handleClearChat}
                className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Clear Conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title={isExpanded ? 'Restore Size' : 'Expand Size'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
            {messages.length === 0 && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-center space-y-3 shadow-sm">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Welcome to the University AI Assistant! 👋
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    I can answer general questions across computer science, math, and science like ChatGPT, 
                    as well as look up live admissions cutoffs, tuition fees, rankings, and document verification.
                  </p>
                </div>
                <div className="pt-2 grid grid-cols-2 gap-1.5 text-left">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-700 font-medium">
                    <GraduationCap className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>Degree Programs & Fees</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-700 font-medium">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>OCR Document Checks</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-700 font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Placements (₹54.2 LPA)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-700 font-medium">
                    <Calculator className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Math & Coding Help</span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isAi = m.sender === 'AI';
              const isSystem = m.sender === 'SYSTEM';
              const isStudentMsg = m.sender === 'STUDENT';

              return (
                <div
                  key={m._id || Math.random()}
                  className={`flex gap-2.5 text-xs ${
                    isStudentMsg ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isStudentMsg && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-sm">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 space-y-1.5 shadow-sm ${
                      isStudentMsg
                        ? 'bg-brand-600 text-white rounded-br-sm'
                        : isSystem
                        ? 'bg-amber-50 text-amber-950 border border-amber-200'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-sm'
                    }`}
                  >
                    {isStudentMsg ? (
                      <p className="whitespace-pre-line leading-relaxed text-[12px]">
                        {m.content}
                      </p>
                    ) : (
                      <FormattedMessage content={m.content} />
                    )}

                    {/* Tool execution badge */}
                    {m.toolCalls && m.toolCalls.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1 border-t border-slate-100 mt-2">
                        {m.toolCalls.map((tc, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-mono text-slate-700 border border-slate-200"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-brand-600" />
                            {tc.toolName || 'executeTool'}()
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isStudentMsg && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-sm">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-sm animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600">
                    Reasoning & generating answer...
                  </span>
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
                onClick={() => handleSendMessage(p.text)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-[10px] font-medium text-slate-700 border border-slate-200/80 transition-all hover:border-brand-200"
              >
                {p.label}
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
              placeholder="Ask anything or request admissions info..."
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder:text-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white hover:from-brand-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-500/20 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
