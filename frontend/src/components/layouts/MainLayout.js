import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CloudArrowUpIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  UsersIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation items based on user role
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Upload Image', href: '/upload', icon: CloudArrowUpIcon },
    { name: 'History', href: '/history', icon: ClockIcon },
    { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  // Add admin-only navigation items
  if (user && user.role === 'admin') {
    navigation.push({ name: 'User Management', href: '/users', icon: UsersIcon });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} role="dialog">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-primary-700 text-white">
          <div className="flex items-center justify-between h-16 px-4 border-b border-primary-800">
            <div className="text-xl font-bold">Medical AI Diagnostics</div>
            <button onClick={() => setSidebarOpen(false)}>
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary-800 text-white'
                    : 'flex items-center px-2 py-2 text-sm font-medium rounded-md text-white hover:bg-primary-600'
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-2 py-2 mt-6 text-sm font-medium text-white rounded-md hover:bg-primary-600"
            >
              <ArrowRightStartOnRectangleIcon className="w-5 h-5 mr-3" />
              Logout
            </button>
          </nav>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:bg-primary-700 lg:text-white">
        <div className="flex items-center justify-center h-16 px-4 border-b border-primary-800">
          <div className="text-xl font-bold">Medical AI Diagnostics</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary-800 text-white'
                  : 'flex items-center px-2 py-2 text-sm font-medium rounded-md text-white hover:bg-primary-600'
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-2 py-2 mt-6 text-sm font-medium text-white rounded-md hover:bg-primary-600"
          >
            <ArrowRightStartOnRectangleIcon className="w-5 h-5 mr-3" />
            Logout
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top navbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white shadow-sm lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="flex items-center">
            {user && (
              <div className="ml-4 text-sm">
                <span className="text-gray-500">Logged in as: </span>
                <span className="font-medium">{user.username}</span>
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">
                  {user.role}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-4 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            Medical AI Diagnostics &copy; {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
