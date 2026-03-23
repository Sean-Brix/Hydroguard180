import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { ScrollManager } from './ScrollManager';
import {
  BookUser,
  Droplets,
  AlertTriangle,
  BarChart3,
  LogOut,
  HelpCircle,
  MessageSquareText,
  MoreHorizontal,
  UserCog,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AlertSystem } from './AlertSystem';
import { AnimatePresence, motion } from 'motion/react';
import { ConfirmModal } from './ConfirmModal';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const executeLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  // Close more menu on route change
  useEffect(() => {
    setMoreMenuOpen(false);
  }, [location.pathname]);

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenuOpen]);

  const allMenuItems = [
    { path: '/dashboard', label: 'Analytics', icon: BarChart3 },
    { path: '/dashboard/monitoring', label: 'Water Monitoring', icon: Droplets },
    { path: '/dashboard/residents', label: 'Resident Directory', icon: BookUser },
    { path: '/dashboard/faq-management', label: 'FAQ Management', icon: HelpCircle },
    { path: '/dashboard/alerts', label: 'Alert Levels', icon: AlertTriangle },
    { path: '/dashboard/inquiries', label: 'Inquiries', icon: MessageSquareText },
    { path: '/dashboard/profile', label: 'Profile', icon: UserCog },
  ];

  const isActive = (path: string) => location.pathname === path;

  const filteredMenuItems = allMenuItems.filter(
    (item) => !item.adminOnly || user?.role === 'Super Admin' || user?.role === 'Admin'
  );

  // Bottom nav: first 3 primary items + "More"
  const bottomNavItems = [
    filteredMenuItems[0], // Analytics
    filteredMenuItems[1], // Water Monitoring
    filteredMenuItems[4] || filteredMenuItems[2], // Alert Levels
  ];

  // Items that go inside the "More" menu
  const moreMenuItems = filteredMenuItems.filter(
    (item) => !bottomNavItems.includes(item)
  );

  // Check if any "more" item is active
  const isMoreActive = moreMenuItems.some((item) => isActive(item.path));

  // Get current page label
  const currentPageLabel =
    filteredMenuItems.find((item) => isActive(item.path))?.label || 'Analytics';

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex">
      <AlertSystem />

      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#26343A] text-white transform transition-transform duration-300 hidden lg:block lg:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-700">
            <Link to="/" className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="font-semibold">Hydro Guard 180</span>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors ${
                    isActive(item.path)
                      ? 'bg-[#FF6A00] text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-700">
            <div className="px-4 py-3 mb-2 bg-gray-700 rounded-md">
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 z-40 flex-shrink-0">
          
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 pb-20 lg:pb-6 overflow-hidden flex flex-col min-h-0">
          <ScrollManager />
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex items-stretch h-16">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  active ? 'text-[#FF6A00]' : 'text-gray-400'
                }`}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF6A00] rounded-b-full" />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label === 'Water Monitoring' ? 'Monitoring' : item.label === 'Alert Levels' ? 'Alerts' : item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <div className="flex-1 relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                isMoreActive || moreMenuOpen ? 'text-[#FF6A00]' : 'text-gray-400'
              }`}
            >
              {(isMoreActive) && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF6A00] rounded-b-full" />
              )}
              <MoreHorizontal size={20} strokeWidth={isMoreActive || moreMenuOpen ? 2.5 : 2} />
              <span className={`text-[10px] ${isMoreActive || moreMenuOpen ? 'font-semibold' : 'font-medium'}`}>
                More
              </span>
            </button>

            {/* More Menu Popover */}
            <AnimatePresence>
              {moreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full right-2 mb-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                >
                  {/* User info header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6A00] to-[#FF8C38] flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {user?.fullName?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1F2937] truncate">{user?.fullName}</p>
                        <p className="text-[10px] text-gray-400">{user?.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation items */}
                  <div className="py-1">
                    {moreMenuItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            active
                              ? 'bg-orange-50 text-[#FF6A00] font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="flex-1">{item.label}</span>
                          {active && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* More menu backdrop (mobile) */}
      <AnimatePresence>
        {moreMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMoreMenuOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={executeLogout}
        title="Logout"
        description="Are you sure you want to log out of the dashboard? You will need to sign in again to access the system."
        confirmLabel="Logout"
        variant="logout"
      />
    </div>
  );
}