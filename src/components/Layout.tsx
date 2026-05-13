import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  History, 
  BarChart3, 
  Settings, 
  UserCog, 
  LogOut, 
  Menu, 
  Bell,
  Search
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const SidebarItem = ({ to, icon, label, onClick }: SidebarItemProps) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )
    }
  >
    {icon}
    <span className="font-medium">{label}</span>
  </NavLink>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/customers', icon: <Users size={20} />, label: 'Customers' },
    { to: '/follow-ups', icon: <PhoneCall size={20} />, label: 'Follow-ups' },
    { to: '/reports', icon: <BarChart3 size={20} />, label: 'Reports' },
    { to: '/logs', icon: <History size={20} />, label: 'Activity Logs' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/users', icon: <UserCog size={20} />, label: 'User Management' });
  }

  navItems.push({ to: '/settings', icon: <Settings size={20} />, label: 'Settings' });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              C
            </div>
            <h1 className="text-xl font-bold tracking-tight">Nexus CRM</h1>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <SidebarItem key={item.to} {...item} onClick={() => setIsSidebarOpen(false)} />
            ))}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-8">
          <button 
            className="lg:hidden p-2 hover:bg-accent rounded-md"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="hidden md:flex items-center max-w-md w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search customers, reports..." 
              className="w-full bg-accent/50 border-none rounded-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-accent rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <img 
                src={user?.avatar} 
                alt={user?.name} 
                className="w-10 h-10 rounded-full border bg-accent"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
