import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  FileSpreadsheet,
  CheckSquare,
  History,
  Calculator,
  BookOpen,
  CalendarCheck2,
  TrendingUp,
  LogOut,
  X
} from 'lucide-react';

const roleMenus = {
  admin: [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Students', path: '/admin/students', icon: GraduationCap },
    { label: 'Faculty', path: '/admin/faculty', icon: Users },
    { label: 'Timetable', path: '/admin/timetable', icon: CalendarDays },
    { label: 'Attendance Records', path: '/admin/attendance', icon: FileSpreadsheet },
  ],
  faculty: [
    { label: 'Overview', path: '/faculty', icon: LayoutDashboard },
    { label: 'My Timetable', path: '/faculty/timetable', icon: CalendarDays },
    { label: 'Attendance History', path: '/faculty/history', icon: History },
  ],
  student: [
    { label: 'Dashboard', path: '/student', icon: LayoutDashboard },
    { label: 'Subject Attendance', path: '/student/subjects', icon: BookOpen },
    { label: 'Shortage Calculator', path: '/student/calculator', icon: Calculator },
    { label: 'Attendance History', path: '/student/history', icon: History },
    { label: 'Class Timetable', path: '/student/timetable', icon: CalendarDays },
  ],
  parent: [
    { label: 'Child Overview', path: '/parent', icon: LayoutDashboard },
    { label: 'Weekly Performance', path: '/parent/weekly', icon: TrendingUp },
    { label: 'Child History', path: '/parent/history', icon: History },
    { label: 'Child Timetable', path: '/parent/timetable', icon: CalendarDays },
  ],
};

export const Sidebar = ({ isOpen, onClose, collapsed = false }) => {
  const { user, logout } = useAuth();
  const menuItems = roleMenus[user?.role] || [];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-64 lg:w-20' : 'w-64'}`}
      >
        {/* Brand header */}
        <div
          className={`flex h-16 items-center border-b border-slate-100 dark:border-slate-800 transition-all ${
            collapsed ? 'justify-between px-6 lg:justify-center lg:px-2' : 'justify-between px-6'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 shrink-0">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <div className={collapsed ? 'lg:hidden' : ''}>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Smart</span>
              <span className="text-base font-bold tracking-tight text-indigo-600 dark:text-indigo-400">Attend</span>
              <p className="text-[10px] font-medium text-slate-400 -mt-1 tracking-wider uppercase">Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Portal Tag */}
        <div className={`px-4 py-3 transition-opacity ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Workspace</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize mt-0.5">
              {user?.role} Portal
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 px-3 py-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin' || item.path === '/faculty' || item.path === '/student' || item.path === '/parent'}
                onClick={() => onClose && onClose()}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    collapsed ? 'lg:justify-center lg:px-2' : ''
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 dark:bg-indigo-600 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={logout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition ${
              collapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
