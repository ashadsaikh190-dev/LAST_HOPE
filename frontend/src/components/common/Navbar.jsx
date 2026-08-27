import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { NotificationBell } from './NotificationBell';
import {
  GraduationCap,
  Copy,
  Check,
  LogOut,
  User,
  Activity,
  ShieldCheck,
  Compass,
} from 'lucide-react';

export const Navbar = () => {
  const { user, student, logout, isStudent, isCounselor, isAdmin } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyTrackingId = () => {
    if (student?.trackingId) {
      navigator.clipboard.writeText(student.trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
                GIET University
              </span>
              <span className="text-[11px] font-semibold text-brand-600 tracking-wider uppercase mt-0.5">
                Autonomous Admissions Agent
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Student Tracking ID or Role Badge */}
        <div className="hidden md:flex items-center gap-3">
          {isStudent && student?.trackingId && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Tracking ID:</span>
              <span className="font-mono font-bold text-brand-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {student.trackingId}
              </span>
              <button
                onClick={handleCopyTrackingId}
                className="text-slate-400 hover:text-brand-600 transition-colors p-1 cursor-pointer"
                title="Copy Student Tracking ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {isCounselor && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 font-bold">
              <span>🧭 Admissions Counseling Desk</span>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-bold">
              <span>🛡️ University Administration</span>
            </div>
          )}
        </div>

        {/* Right: Real-time status, Notifications & User Profile */}
        <div className="flex items-center gap-3">
          {/* Socket.IO Real-time Connection Indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600"
            title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to real-time server...'}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isConnected ? 'Live' : 'Connecting'}</span>
          </div>

          {/* Notifications */}
          {user && <NotificationBell />}

          {/* User Details & Logout */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 leading-none">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
                  {user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shadow-brand-500/20 transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
