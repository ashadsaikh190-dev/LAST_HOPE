import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  CreditCard,
  Award,
  IdCard,
  BookOpen,
  User,
  Search,
  AlertTriangle,
  FileCheck2,
  MessagesSquare,
  Users,
  ScrollText,
  Activity,
  Settings,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, isStudent, isCounselor, isAdmin } = useAuth();

  if (!user) return null;

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/application', label: 'My Application', icon: FileText },
    { to: '/documents', label: 'Documents & OCR', icon: FolderOpen },
    { to: '/payment', label: 'Fee Payment', icon: CreditCard },
    { to: '/admission', label: 'Admission Offer', icon: Award },
    { to: '/enrollment', label: 'Official Enrollment', icon: IdCard },
    { to: '/programs', label: 'Academic Programs', icon: BookOpen },
    { to: '/profile', label: 'Student Profile', icon: User },
  ];

  const counselorLinks = [
    { to: '/counselor', label: 'Desk Overview', icon: LayoutDashboard },
    { to: '/counselor/search', label: 'Universal Search', icon: Search },
    { to: '/counselor/cases', label: 'Escalations Inbox', icon: AlertTriangle },
    { to: '/counselor/documents', label: 'Verification Desk', icon: FileCheck2 },
    { to: '/counselor/conversations', label: 'AI Conversations', icon: MessagesSquare },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Institutional Metrics', icon: LayoutDashboard },
    { to: '/admin/programs', label: 'Program Catalog', icon: BookOpen },
    { to: '/admin/users', label: 'Staff & Roles', icon: Users },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/admin/health', label: 'AWS & System Health', icon: Activity },
  ];

  const links = isStudent ? studentLinks : isCounselor ? counselorLinks : adminLinks;

  return (
    <aside className="w-64 shrink-0 hidden md:block border-r border-slate-200/80 bg-white/60 backdrop-blur-sm min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {isStudent ? 'Student Lifecycle' : isCounselor ? 'Counselor Console' : 'Administration'}
        </div>

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/dashboard' || link.to === '/counselor' || link.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                    : 'text-slate-600 hover:text-brand-600 hover:bg-slate-100/70'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};
