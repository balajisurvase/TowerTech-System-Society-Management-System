import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Calendar, 
  MessageSquare, 
  Shield, 
  LogOut, 
  Plus, 
  CheckCircle, 
  Clock, 
  UserPlus,
  Building2,
  TrendingUp,
  ChevronRight,
  Menu,
  X,
  MapPin,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Role = 'admin' | 'resident' | 'security';

interface User {
  id: number;
  username: string;
  role: Role;
  flat_id: string | null;
  name: string;
}

interface Flat {
  id: string;
  tower: string;
  floor: number;
  flat_number: number;
  owner_name: string;
  maintenance_status: 'Paid' | 'Unpaid';
}

interface Bill {
  id: number;
  flat_id: string;
  amount: number;
  month: string;
  due_date: string;
  status: 'Paid' | 'Unpaid';
}

interface Complaint {
  id: number;
  flat_id: string;
  title: string;
  description: string;
  status: 'Pending' | 'Resolved';
  created_at: string;
}

interface Alert {
  id: number;
  tower: string;
  title: string;
  message: string;
  severity: 'Low' | 'Medium' | 'High';
  created_at: string;
}

interface Visitor {
  id: number;
  name: string;
  tower: string;
  flat_id: string;
  entry_time: string;
  exit_time: string | null;
  status: 'In' | 'Out';
}

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
}

// --- Components ---

const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden", className)} {...props}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }) => {
  const variants = {
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-blue-100 text-blue-700",
    neutral: "bg-slate-100 text-slate-700"
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", variants[variant])}>
      {children}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // Auth Logic
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username');
    const password = formData.get('password');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setActiveTab('dashboard');
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                <Building2 className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">TowerTech System</h1>
              <p className="text-slate-500 text-sm">Society Management Platform</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input 
                  name="username"
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="admin, resident, or security"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input 
                  name="password"
                  type="password" 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="admin123, res123, or sec123"
                />
              </div>
              <Button disabled={loading} className="w-full py-3 mt-2">
                {loading ? "Logging in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-center text-slate-400 mb-4 uppercase tracking-wider font-semibold">Demo Credentials</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500">ADMIN</p>
                  <p className="text-[10px] text-slate-400">admin / admin123</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500">RESIDENT</p>
                  <p className="text-[10px] text-slate-400">resident / res123</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500">SECURITY</p>
                  <p className="text-[10px] text-slate-400">security / sec123</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full lg:hidden"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 truncate">TowerTech</span>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            
            {user.role === 'admin' && (
              <>
                <SidebarItem icon={<Users size={20} />} label="Towers & Flats" active={activeTab === 'flats'} onClick={() => setActiveTab('flats')} />
                <SidebarItem icon={<CreditCard size={20} />} label="Maintenance" active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} />
                <SidebarItem icon={<AlertTriangle size={20} />} label="Emergency Alerts" active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
                <SidebarItem icon={<Calendar size={20} />} label="Society Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
                <SidebarItem icon={<TrendingUp size={20} />} label="Financial Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
              </>
            )}

            {user.role === 'resident' && (
              <>
                <SidebarItem icon={<CreditCard size={20} />} label="My Bills" active={activeTab === 'bills'} onClick={() => setActiveTab('bills')} />
                <SidebarItem icon={<MessageSquare size={20} />} label="Complaints" active={activeTab === 'complaints'} onClick={() => setActiveTab('complaints')} />
                <SidebarItem icon={<Calendar size={20} />} label="Amenity Booking" active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} />
                <SidebarItem icon={<Shield size={20} />} label="Visitor History" active={activeTab === 'visitors'} onClick={() => setActiveTab('visitors')} />
              </>
            )}

            {user.role === 'security' && (
              <>
                <SidebarItem icon={<Shield size={20} />} label="Visitor Log" active={activeTab === 'visitors'} onClick={() => setActiveTab('visitors')} />
                <SidebarItem icon={<UserPlus size={20} />} label="New Entry" active={activeTab === 'new-entry'} onClick={() => setActiveTab('new-entry')} />
              </>
            )}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu size={20} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-medium text-slate-900">{format(new Date(), 'EEEE, do MMMM')}</p>
              <p className="text-xs text-slate-500">TowerTech Society</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <DashboardView user={user} />}
              {activeTab === 'flats' && <AdminFlatsView />}
              {activeTab === 'maintenance' && <AdminMaintenanceView />}
              {activeTab === 'alerts' && <AdminAlertsView />}
              {activeTab === 'events' && <AdminEventsView />}
              {activeTab === 'reports' && <AdminReportsView />}
              {activeTab === 'bills' && <ResidentBillsView user={user} />}
              {activeTab === 'complaints' && <ResidentComplaintsView user={user} />}
              {activeTab === 'bookings' && <ResidentBookingsView user={user} />}
              {activeTab === 'visitors' && (user.role === 'security' ? <SecurityVisitorsView /> : <ResidentVisitorsView user={user} />)}
              {activeTab === 'new-entry' && <SecurityNewEntryView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all",
        active 
          ? "bg-blue-50 text-blue-600" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
    </button>
  );
}

// --- Views ---

function DashboardView({ user }: { user: User }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user.role === 'admin') {
      fetch('/api/admin/stats').then(res => res.json()).then(setStats);
    }
  }, [user]);

  if (user.role === 'admin' && stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Building2 className="text-blue-600" />} label="Total Flats" value={stats.totalFlats} color="blue" />
          <StatCard icon={<CheckCircle className="text-emerald-600" />} label="Paid Maintenance" value={stats.paidFlats} color="emerald" />
          <StatCard icon={<MessageSquare className="text-amber-600" />} label="Pending Complaints" value={stats.pendingComplaints} color="amber" />
          <StatCard icon={<Users className="text-indigo-600" />} label="Active Visitors" value={stats.activeVisitors} color="indigo" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6">Collection Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Collected', value: stats.totalCollected },
                  { name: 'Pending', value: stats.totalPending }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6">AI Budget Prediction</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <TrendingUp className="text-blue-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Projected Expense Growth</p>
                    <p className="text-xs text-blue-700 mt-1">Based on last 3 months, utility costs are rising by 8.5%.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-medium text-slate-600">Recommendation</p>
                <p className="text-lg font-bold text-slate-900 mt-1">Increase maintenance by ₹200</p>
                <p className="text-xs text-slate-500 mt-1">To maintain a healthy reserve fund for upcoming elevator servicing.</p>
              </div>
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-slate-500">Confidence Level</span>
                <span className="text-sm font-bold text-emerald-600">92%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[92%]" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-8 bg-blue-600 rounded-2xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Welcome back, {user.name}!</h2>
          <p className="opacity-80 mt-1">Everything looks good in the society today.</p>
          <div className="mt-8 flex gap-4">
            <div className="bg-white/20 backdrop-blur-md p-4 rounded-xl">
              <p className="text-xs opacity-70 uppercase font-bold">Current Status</p>
              <p className="text-xl font-bold mt-1">All Clear</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-4 rounded-xl">
              <p className="text-xs opacity-70 uppercase font-bold">Active Alerts</p>
              <p className="text-xl font-bold mt-1">0</p>
            </div>
          </div>
        </div>
        <Building2 className="absolute -right-8 -bottom-8 w-64 h-64 opacity-10 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <h3 className="font-bold">Upcoming Events</h3>
          </div>
          <div className="space-y-4">
            <EventItem title="Annual General Meeting" date="March 15, 2026" />
            <EventItem title="Holi Celebration" date="March 22, 2026" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-bold">Recent Alerts</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-500 italic">No active alerts for your tower.</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Shield size={20} />
            </div>
            <h3 className="font-bold">Security Status</h3>
          </div>
          <p className="text-sm text-slate-600">Gate security is active. Last visitor recorded 15 mins ago.</p>
          <Button variant="secondary" className="w-full mt-4 text-xs">View Security Log</Button>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: any, color: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-xl", `bg-${color}-50`)}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function EventItem({ title, date }: { title: string, date: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-blue-500" />
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{date}</p>
      </div>
    </div>
  );
}

// --- Admin Views ---

function AdminFlatsView() {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetch('/api/admin/flats').then(res => res.json()).then(setFlats);
  }, []);

  const filteredFlats = filter === 'All' ? flats : flats.filter(f => f.tower === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['All', 'A', 'B', 'C', 'D'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                filter === t ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              Tower {t}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500">Total: {filteredFlats.length} Flats</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredFlats.map(flat => (
          <Card key={flat.id} className="p-4 hover:border-blue-200 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-lg font-bold text-slate-900">{flat.id}</span>
              <Badge variant={flat.maintenance_status === 'Paid' ? 'success' : 'danger'}>
                {flat.maintenance_status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-4">{flat.owner_name}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="text-[10px] px-2 py-1 flex-1">Details</Button>
              {flat.maintenance_status === 'Unpaid' && (
                <Button 
                  onClick={async () => {
                    await fetch('/api/admin/mark-paid', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ flatId: flat.id })
                    });
                    setFlats(flats.map(f => f.id === flat.id ? { ...f, maintenance_status: 'Paid' } : f));
                  }}
                  className="text-[10px] px-2 py-1 flex-1"
                >
                  Mark Paid
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminMaintenanceView() {
  const [loading, setLoading] = useState(false);

  const generateBills = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/generate-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: format(new Date(), 'MMMM yyyy'),
          amount: 1500,
          dueDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 10), 'yyyy-MM-dd')
        })
      });
      alert("Bills generated successfully!");
    } catch (err) {
      alert("Failed to generate bills");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-8">
        <h3 className="text-xl font-bold mb-6">Generate Monthly Bills</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Billing Month</label>
              <input type="text" readOnly value={format(new Date(), 'MMMM yyyy')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
              <input type="number" defaultValue={1500} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
            <input type="date" defaultValue={format(new Date(new Date().getFullYear(), new Date().getMonth(), 10), 'yyyy-MM-dd')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
            <Info className="text-blue-600 shrink-0" size={20} />
            <p className="text-xs text-blue-700">Generating bills will create a new maintenance record for all 112 flats. Residents will receive an automated simulation email.</p>
          </div>
          <Button onClick={generateBills} disabled={loading} className="w-full py-3">
            {loading ? "Generating..." : "Generate Bills for All Flats"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AdminAlertsView() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      tower: formData.get('tower'),
      title: formData.get('title'),
      message: formData.get('message'),
      severity: formData.get('severity')
    };

    try {
      await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      alert("Alert sent successfully!");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      alert("Failed to send alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <h3 className="text-xl font-bold mb-6">Create Emergency Alert</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Tower</label>
              <select name="tower" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none">
                <option value="All">All Towers</option>
                <option value="A">Tower A</option>
                <option value="B">Tower B</option>
                <option value="C">Tower C</option>
                <option value="D">Tower D</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
              <select name="severity" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alert Title</label>
            <input name="title" required type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" placeholder="e.g., Water Supply Interruption" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea name="message" required rows={4} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" placeholder="Detailed message for residents..." />
          </div>
          <Button disabled={loading} className="w-full py-3">
            {loading ? "Sending..." : "Broadcast Alert"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function AdminEventsView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/events').then(res => res.json()).then(setEvents);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      date: formData.get('date')
    };

    try {
      await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const res = await fetch('/api/events');
      const newEvents = await res.json();
      setEvents(newEvents);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      alert("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-1 h-fit">
        <h3 className="text-lg font-bold mb-4">Add New Event</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
            <input name="title" required type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input name="date" required type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" required rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
          </div>
          <Button disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold">Upcoming Events</h3>
        {events.map(event => (
          <Card key={event.id} className="p-4 flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-600 shrink-0">
              <span className="text-xs font-bold uppercase">{format(new Date(event.date), 'MMM')}</span>
              <span className="text-xl font-black">{format(new Date(event.date), 'dd')}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900">{event.title}</h4>
              <p className="text-sm text-slate-500 line-clamp-1">{event.description}</p>
            </div>
            <Button variant="ghost" className="text-slate-400 hover:text-rose-500">
              <X size={18} />
            </Button>
          </Card>
        ))}
        {events.length === 0 && <p className="text-center py-12 text-slate-400">No events scheduled.</p>}
      </div>
    </div>
  );
}

function AdminReportsView() {
  const data = [
    { name: 'Jan', income: 168000, expense: 120000 },
    { name: 'Feb', income: 168000, expense: 135000 },
    { name: 'Mar', income: 168000, expense: 142000 },
    { name: 'Apr', income: 168000, expense: 158000 },
  ];

  const pieData = [
    { name: 'Security', value: 45000 },
    { name: 'Maintenance', value: 35000 },
    { name: 'Utilities', value: 25000 },
    { name: 'Landscaping', value: 15000 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6">Income vs Expense</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6">Expense Distribution</h3>
          <div className="h-80 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Financial Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 font-semibold text-slate-500 text-sm">Category</th>
                <th className="py-3 font-semibold text-slate-500 text-sm">Budgeted</th>
                <th className="py-3 font-semibold text-slate-500 text-sm">Actual</th>
                <th className="py-3 font-semibold text-slate-500 text-sm">Variance</th>
                <th className="py-3 font-semibold text-slate-500 text-sm text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <ReportRow category="Security Services" budgeted={45000} actual={45000} />
              <ReportRow category="Electrical Maintenance" budgeted={15000} actual={18500} />
              <ReportRow category="Water Supply" budgeted={20000} actual={19200} />
              <ReportRow category="Cleaning & Hygiene" budgeted={12000} actual={12000} />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReportRow({ category, budgeted, actual }: { category: string, budgeted: number, actual: number }) {
  const variance = actual - budgeted;
  const isOver = variance > 0;

  return (
    <tr>
      <td className="py-4 font-medium text-slate-900">{category}</td>
      <td className="py-4 text-slate-600">₹{budgeted.toLocaleString()}</td>
      <td className="py-4 text-slate-600">₹{actual.toLocaleString()}</td>
      <td className={cn("py-4", isOver ? "text-rose-600" : "text-emerald-600")}>
        {isOver ? "+" : ""}₹{variance.toLocaleString()}
      </td>
      <td className="py-4 text-right">
        <Badge variant={isOver ? 'danger' : 'success'}>{isOver ? 'Over' : 'Under'}</Badge>
      </td>
    </tr>
  );
}

// --- Resident Views ---

function ResidentBillsView({ user }: { user: User }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/resident/details/${user.flat_id}`).then(res => res.json()).then(setData);
  }, [user]);

  if (!data) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1 bg-blue-600 text-white">
          <p className="text-xs opacity-70 uppercase font-bold">Current Outstanding</p>
          <h3 className="text-4xl font-black mt-2">₹{data.flat.maintenance_status === 'Unpaid' ? '1,500' : '0'}</h3>
          <p className="text-sm opacity-80 mt-4">Flat {user.flat_id}</p>
          <p className="text-sm opacity-80">{user.name}</p>
          {data.flat.maintenance_status === 'Unpaid' && (
            <Button variant="secondary" className="w-full mt-6 text-blue-600 font-bold">Pay Now</Button>
          )}
        </Card>

        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-bold">Billing History</h3>
          {data.bills.map((bill: Bill) => (
            <Card key={bill.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{bill.month}</p>
                <p className="text-xs text-slate-500">Due: {bill.due_date}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">₹{bill.amount}</p>
                <Badge variant={bill.status === 'Paid' ? 'success' : 'danger'}>{bill.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResidentComplaintsView({ user }: { user: User }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/resident/complaints/${user.flat_id}`).then(res => res.json()).then(setComplaints);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      flatId: user.flat_id,
      title: formData.get('title'),
      description: formData.get('description')
    };

    try {
      await fetch('/api/resident/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const res = await fetch(`/api/resident/complaints/${user.flat_id}`);
      const newComplaints = await res.json();
      setComplaints(newComplaints);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      alert("Failed to raise complaint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-1 h-fit">
        <h3 className="text-lg font-bold mb-4">Raise a Complaint</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Issue Title</label>
            <input name="title" required type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" placeholder="e.g., Leakage in Bathroom" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" required rows={4} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" placeholder="Describe the issue in detail..." />
          </div>
          <Button disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Complaint"}
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold">Your Complaints</h3>
        {complaints.map(c => (
          <Card key={c.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-900">{c.title}</h4>
              <Badge variant={c.status === 'Resolved' ? 'success' : 'warning'}>{c.status}</Badge>
            </div>
            <p className="text-sm text-slate-600 mb-3">{c.description}</p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Clock size={12} />
              <span>{format(new Date(c.created_at), 'PPP p')}</span>
            </div>
          </Card>
        ))}
        {complaints.length === 0 && <p className="text-center py-12 text-slate-400">No complaints raised yet.</p>}
      </div>
    </div>
  );
}

function ResidentBookingsView({ user }: { user: User }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/amenities/bookings').then(res => res.json()).then(setBookings);
  }, []);

  const handleBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      flatId: user.flat_id,
      amenity: formData.get('amenity'),
      date: formData.get('date'),
      timeSlot: formData.get('timeSlot')
    };

    try {
      const res = await fetch('/api/amenities/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        const bRes = await fetch('/api/amenities/bookings');
        setBookings(await bRes.json());
        alert("Booking confirmed!");
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-1 h-fit">
        <h3 className="text-lg font-bold mb-4">Book Amenity</h3>
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Amenity</label>
            <select name="amenity" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none">
              <option value="Clubhouse">Clubhouse</option>
              <option value="Gym">Gym</option>
              <option value="Swimming Pool">Swimming Pool</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input name="date" required type="date" min={format(new Date(), 'yyyy-MM-dd')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time Slot</label>
            <select name="timeSlot" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none">
              <option value="06:00 AM - 08:00 AM">06:00 AM - 08:00 AM</option>
              <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</option>
              <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
              <option value="06:00 PM - 08:00 PM">06:00 PM - 08:00 PM</option>
            </select>
          </div>
          <Button disabled={loading} className="w-full">
            {loading ? "Checking..." : "Confirm Booking"}
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold">Society Bookings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map(b => (
            <Card key={b.id} className={cn("p-4 border-l-4", b.flat_id === user.flat_id ? "border-l-blue-600" : "border-l-slate-200")}>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-900">{b.amenity}</h4>
                {b.flat_id === user.flat_id && <Badge variant="info">Your Booking</Badge>}
              </div>
              <p className="text-sm text-slate-600 mt-1">{format(new Date(b.date), 'PPP')}</p>
              <p className="text-xs text-slate-500">{b.time_slot}</p>
              <p className="text-[10px] text-slate-400 mt-2">Booked by Flat {b.flat_id}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResidentVisitorsView({ user }: { user: User }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    fetch(`/api/resident/details/${user.flat_id}`).then(res => res.json()).then(data => setVisitors(data.visitors));
  }, [user]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Visitor History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 font-semibold text-slate-500 text-sm">Visitor Name</th>
              <th className="py-3 font-semibold text-slate-500 text-sm">Entry Time</th>
              <th className="py-3 font-semibold text-slate-500 text-sm">Exit Time</th>
              <th className="py-3 font-semibold text-slate-500 text-sm text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visitors.map(v => (
              <tr key={v.id}>
                <td className="py-4 font-medium text-slate-900">{v.name}</td>
                <td className="py-4 text-slate-600 text-sm">{format(new Date(v.entry_time), 'PPP p')}</td>
                <td className="py-4 text-slate-600 text-sm">{v.exit_time ? format(new Date(v.exit_time), 'PPP p') : '-'}</td>
                <td className="py-4 text-right">
                  <Badge variant={v.status === 'In' ? 'warning' : 'neutral'}>{v.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visitors.length === 0 && <p className="text-center py-12 text-slate-400">No visitor records found.</p>}
    </div>
  );
}

// --- Security Views ---

function SecurityVisitorsView() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    fetch('/api/security/visitors').then(res => res.json()).then(setVisitors);
  }, []);

  const handleExit = async (id: number) => {
    await fetch('/api/security/visitor-exit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const res = await fetch('/api/security/visitors');
    setVisitors(await res.json());
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Daily Visitor Log</h3>
        <Badge variant="info">{visitors.filter(v => v.status === 'In').length} Currently Inside</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visitors.map(v => (
          <Card key={v.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-slate-900">{v.name}</h4>
                <p className="text-xs text-slate-500">Flat {v.flat_id} (Tower {v.tower})</p>
              </div>
              <Badge variant={v.status === 'In' ? 'warning' : 'neutral'}>{v.status}</Badge>
            </div>
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Clock size={12} />
                <span>In: {format(new Date(v.entry_time), 'p')}</span>
              </div>
              {v.exit_time && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <Clock size={12} />
                  <span>Out: {format(new Date(v.exit_time), 'p')}</span>
                </div>
              )}
            </div>
            {v.status === 'In' && (
              <Button onClick={() => handleExit(v.id)} variant="secondary" className="w-full text-xs">Mark Exit</Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function SecurityNewEntryView() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      tower: formData.get('tower'),
      flatId: formData.get('flatId')
    };

    try {
      await fetch('/api/security/visitor-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      alert("Entry recorded successfully!");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      alert("Failed to record entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-8">
        <h3 className="text-xl font-bold mb-6">Record New Visitor</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Visitor Name</label>
            <input name="name" required type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" placeholder="Full Name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tower</label>
              <select name="tower" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none">
                <option value="A">Tower A</option>
                <option value="B">Tower B</option>
                <option value="C">Tower C</option>
                <option value="D">Tower D</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Flat Number</label>
              <input name="flatId" required type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" placeholder="e.g., A-101" />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-3">
            <MapPin className="text-slate-400 shrink-0" size={20} />
            <p className="text-xs text-slate-500">Entry time will be automatically recorded as {format(new Date(), 'p')}.</p>
          </div>
          <Button disabled={loading} className="w-full py-3">
            {loading ? "Recording..." : "Check In Visitor"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
