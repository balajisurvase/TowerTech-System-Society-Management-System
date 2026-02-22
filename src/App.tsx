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
  Info,
  Moon,
  Sun,
  FileText,
  Download,
  Search,
  Filter,
  Activity
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
  society_name?: string;
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
  category: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  created_at: string;
}

interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
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
  <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md", className)} {...props}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled,
  type = "button"
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: "submit" | "button";
}) => {
  const variants = {
    primary: "bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-white text-[#1E293B] border border-slate-200 hover:bg-slate-50",
    danger: "bg-[#DC2626] text-white shadow-lg shadow-red-200 hover:bg-red-700",
    ghost: "bg-transparent text-[#64748B] hover:bg-slate-50 hover:text-[#1E293B]"
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-6 py-2.5 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
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
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    danger: "bg-rose-50 text-rose-600 border-rose-100",
    neutral: "bg-slate-50 text-slate-600 border-slate-100",
    info: "bg-blue-50 text-blue-600 border-blue-100"
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", variants[variant])}>
      {children}
    </span>
  );
};

const Table = ({ headers, children }: { headers: string[], children: React.ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-slate-100">
          {headers.map((header, i) => (
            <th key={i} className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-widest">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {children}
      </tbody>
    </table>
  </div>
);

const TableRow = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <tr className={cn("hover:bg-[#F8FAFC] transition-colors group", className)}>
    {children}
  </tr>
);

const TableCell = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <td className={cn("px-6 py-4 text-sm text-[#1E293B]", className)}>
    {children}
  </td>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('towertech_token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('towertech_dark') === 'true');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [towers, setTowers] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [selectedTower, setSelectedTower] = useState<string>('');
  const [availableFlats, setAvailableFlats] = useState<string[]>([]);

  useEffect(() => {
    if (selectedTower) {
      // Simulate fetching flats for tower
      const flats = Array.from({ length: 28 }, (_, i) => {
        const floor = Math.floor(i / 4) + 1;
        const num = (i % 4) + 1;
        return `${selectedTower}-${floor}0${num}`;
      });
      setAvailableFlats(flats);
    }
  }, [selectedTower]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('towertech_dark', isDarkMode.toString());
  }, [isDarkMode]);

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error("Session expired");
    }
    return res;
  };

  // Auth Logic
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const societyName = formData.get('societyName') as string;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password, societyName })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('towertech_token', data.token);
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

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (data.password !== data.confirmPassword) {
      alert("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          username: data.email,
          flatId: data.flatNumber
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("Account created! Please login.");
        setAuthMode('login');
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (data.newPassword !== data.confirmPassword) {
      alert("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        alert("Password reset successful! Please login.");
        setAuthMode('login');
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('towertech_token');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        {/* Top Header Section */}
        <div className="p-8 text-center bg-white border-b border-slate-100">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Building2 className="w-6 h-6 text-[#2563EB]" />
            <h1 className="text-2xl font-black text-[#1E293B] tracking-tight">TowerTech System</h1>
          </div>
          <p className="text-sm font-bold text-[#64748B] uppercase tracking-widest mb-2">Smart Society Management Platform</p>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-[#2563EB] uppercase tracking-widest">
            <span>Secure</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Digital</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Efficient</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <AnimatePresence mode="wait">
            {authMode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-5xl bg-white rounded-[24px] shadow-2xl shadow-blue-100/50 overflow-hidden flex flex-col md:flex-row border border-slate-100"
              >
                {/* Left Side Panel - Branding Section */}
                <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] p-16 flex-col justify-between text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -ml-32 -mb-32 blur-3xl" />
                  
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-black mb-4 leading-tight">Welcome Back 👋</h2>
                    <p className="text-blue-100 text-lg mb-8 font-medium">Manage your apartment operations smoothly with:</p>
                    
                    <div className="space-y-5">
                      {[
                        "Maintenance Billing & Tracking",
                        "Complaint Management",
                        "Emergency Alerts",
                        "Amenity & Clubhouse Booking",
                        "Financial Dashboard & Reports"
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-4 group">
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/40 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <p className="font-semibold text-blue-50">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 pt-12 border-t border-white/10">
                    <p className="text-sm font-medium text-blue-100/80">A complete digital solution for modern housing societies.</p>
                  </div>
                </div>

                {/* Right Side - Login Form Card */}
                <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center">
                  <div className="mb-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🔐</span>
                      <h2 className="text-2xl font-black text-[#1E293B]">Login to Your Account</h2>
                    </div>
                    <p className="text-[#64748B] font-medium">Please enter your details to access your society dashboard.</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Society Name</label>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text" 
                          name="societyName" 
                          placeholder="Enter your society name" 
                          required 
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="email" 
                          name="email" 
                          placeholder="Enter registered email" 
                          required 
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Password</label>
                        <button 
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest hover:text-blue-700 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="password" 
                          name="password" 
                          placeholder="Enter password" 
                          required 
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input 
                        id="remember-me" 
                        name="remember-me" 
                        type="checkbox" 
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded-md cursor-pointer" 
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-[#64748B] font-medium cursor-pointer">
                        Remember Me
                      </label>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full py-4 text-sm font-bold uppercase tracking-widest shadow-xl shadow-blue-100"
                    >
                      {loading ? <Clock className="animate-spin mx-auto" /> : "Login to Dashboard"}
                    </Button>

                    <div className="text-center pt-4">
                      <p className="text-sm text-[#64748B] font-medium">
                        Don’t have an account?{" "}
                        <button 
                          type="button"
                          onClick={() => setAuthMode('register')}
                          className="text-[#2563EB] font-bold hover:underline"
                        >
                          Create New Account
                        </button>
                      </p>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {authMode === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-3xl bg-white rounded-[24px] shadow-2xl shadow-blue-100/50 p-8 md:p-12 border border-slate-100"
              >
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-black text-[#1E293B] mb-2">Create Your Account</h2>
                  <p className="text-[#64748B] font-medium">Register to access your society services digitally.</p>
                </div>

                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Full Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      placeholder="Enter your full name" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Email Address</label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Enter registered email" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Mobile Number</label>
                    <input 
                      type="tel" 
                      name="mobileNumber" 
                      placeholder="Enter mobile number" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Society Name</label>
                    <input 
                      type="text" 
                      name="societyName" 
                      placeholder="Enter your society name manually" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Tower Name</label>
                    <select 
                      name="tower" 
                      required 
                      value={selectedTower}
                      onChange={(e) => setSelectedTower(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium appearance-none"
                    >
                      <option value="">Select Tower</option>
                      {['A', 'B', 'C', 'D'].map(t => <option key={t} value={t}>Tower {t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Flat Number</label>
                    <select 
                      name="flatNumber" 
                      required 
                      disabled={!selectedTower}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium disabled:opacity-50 appearance-none"
                    >
                      <option value="">Select Flat</option>
                      {availableFlats.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Create Password</label>
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="Create password" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Confirm Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      placeholder="Confirm password" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full py-4 text-sm font-bold uppercase tracking-widest shadow-xl shadow-blue-100"
                    >
                      {loading ? <Clock className="animate-spin mx-auto" /> : "Create Account"}
                    </Button>
                  </div>

                  <div className="md:col-span-2 text-center">
                    <p className="text-sm text-[#64748B] font-medium">
                      Already have an account?{" "}
                      <button 
                        type="button"
                        onClick={() => setAuthMode('login')}
                        className="text-[#2563EB] font-bold hover:underline"
                      >
                        Back to Login
                      </button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {authMode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-md bg-white rounded-[24px] shadow-2xl shadow-blue-100/50 p-8 md:p-12 border border-slate-100"
              >
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-black text-[#1E293B] mb-2">Reset Your Password</h2>
                  <p className="text-[#64748B] font-medium">Enter your society name and registered email to reset your password.</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Society Name</label>
                    <input 
                      type="text" 
                      name="societyName" 
                      placeholder="Enter society name" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Email Address</label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Enter registered email" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">New Password</label>
                    <input 
                      type="password" 
                      name="newPassword" 
                      placeholder="Enter new password" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Confirm Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      placeholder="Confirm new password" 
                      required 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-4 text-sm font-bold uppercase tracking-widest shadow-xl shadow-blue-100"
                  >
                    {loading ? <Clock className="animate-spin mx-auto" /> : "Reset Password"}
                  </Button>

                  <div className="text-center">
                    <button 
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-sm text-[#2563EB] font-bold hover:underline"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 text-center border-t border-slate-100">
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-widest">© 2026 TowerTech System. All Rights Reserved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white transition-transform duration-300 lg:relative lg:translate-x-0 shadow-2xl",
        !isSidebarOpen && "-translate-x-full lg:hidden"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="block font-bold text-xl tracking-tight">TowerTech</span>
              <span className="block text-[10px] text-blue-300/60 uppercase tracking-widest font-bold">Management System</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-blue-200" />
            </button>
          </div>

          <nav className="flex-1 px-6 space-y-1.5 overflow-y-auto py-4">
            <p className="px-3 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-4">Main Menu</p>
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
                <SidebarItem icon={<Activity size={20} />} label="Activity Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
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

          <div className="p-6 mt-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-inner">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-blue-300/60 uppercase font-bold tracking-wider">{user.role}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-6 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <Menu size={20} className="text-slate-600" />
            </button>
            
            <div className="hidden md:flex items-center gap-3 bg-[#F8FAFC] px-4 py-2.5 rounded-xl border border-slate-100 w-full max-w-md group focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{user.society_name || 'Green Valley'}</span>
            </div>

            <div className="h-8 w-[1px] bg-slate-100 mx-2" />

            <div className="relative">
              <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors relative group">
                <AlertTriangle size={20} className="group-hover:text-blue-600" />
                <span className="absolute top-2 right-2 w-4 h-4 bg-[#DC2626] text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  3
                </span>
              </button>
            </div>

            <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors group">
              <Calendar size={20} className="group-hover:text-blue-600" />
            </button>

            <div className="h-8 w-[1px] bg-slate-100 mx-2" />

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#1E293B]">{user.name}</p>
                <p className="text-[10px] text-[#64748B] font-medium">{format(new Date(), 'MMM dd, yyyy')}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-sm">
                {user.name.charAt(0)}
              </div>
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
              {activeTab === 'dashboard' && <DashboardView user={user} apiFetch={apiFetch} />}
              {activeTab === 'flats' && <AdminFlatsView apiFetch={apiFetch} />}
              {activeTab === 'maintenance' && <AdminMaintenanceView apiFetch={apiFetch} />}
              {activeTab === 'alerts' && <AdminAlertsView apiFetch={apiFetch} />}
              {activeTab === 'events' && <AdminEventsView apiFetch={apiFetch} />}
              {activeTab === 'reports' && <AdminReportsView apiFetch={apiFetch} />}
              {activeTab === 'logs' && <AdminLogsView apiFetch={apiFetch} />}
              {activeTab === 'bills' && <ResidentBillsView user={user} apiFetch={apiFetch} />}
              {activeTab === 'complaints' && <ResidentComplaintsView user={user} apiFetch={apiFetch} />}
              {activeTab === 'bookings' && <ResidentBookingsView user={user} apiFetch={apiFetch} />}
              {activeTab === 'visitors' && (user.role === 'security' ? <SecurityVisitorsView apiFetch={apiFetch} /> : <ResidentVisitorsView user={user} apiFetch={apiFetch} />)}
              {activeTab === 'new-entry' && <SecurityNewEntryView apiFetch={apiFetch} />}
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
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-white/15 text-white shadow-sm" 
          : "text-blue-100/70 hover:bg-white/10 hover:text-white"
      )}
    >
      <div className={cn(
        "transition-transform duration-200",
        active ? "scale-110" : "group-hover:scale-110"
      )}>
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        />
      )}
    </button>
  );
}

// --- Views ---

function DashboardView({ user, apiFetch }: { user: User, apiFetch: any }) {
  const [stats, setStats] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    if (user.role === 'admin') {
      apiFetch('/api/admin/stats').then((res: any) => res.json()).then(setStats);
      apiFetch('/api/admin/ai-prediction').then((res: any) => res.json()).then(setPrediction);
    }
  }, [user]);

  if (user.role === 'admin' && stats) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<Users className="text-blue-600 w-6 h-6" />} 
            label="Total Residents" 
            value={stats.totalFlats} 
            color="bg-blue-50" 
            borderColor="border-blue-500"
          />
          <StatCard 
            icon={<CheckCircle className="text-emerald-600 w-6 h-6" />} 
            label="Paid Maintenance" 
            value={stats.paidFlats} 
            color="bg-emerald-50" 
            borderColor="border-emerald-500"
          />
          <StatCard 
            icon={<Clock className="text-amber-600 w-6 h-6" />} 
            label="Pending Maintenance" 
            value={stats.totalFlats - stats.paidFlats} 
            color="bg-amber-50" 
            borderColor="border-amber-500"
          />
          <StatCard 
            icon={<TrendingUp className="text-indigo-600 w-6 h-6" />} 
            label="Total Revenue" 
            value={`₹${stats.totalCollected?.toLocaleString()}`} 
            color="bg-indigo-50" 
            borderColor="border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-[#1E293B]">Financial Overview</h3>
                <p className="text-sm text-[#64748B]">Income vs Pending Maintenance</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#2563EB]" />
                  <span className="text-xs font-bold text-[#64748B]">Collected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <span className="text-xs font-bold text-[#64748B]">Pending</span>
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Jan', collected: stats.totalCollected * 0.8, pending: stats.totalPending * 0.2 },
                  { name: 'Feb', collected: stats.totalCollected * 0.85, pending: stats.totalPending * 0.15 },
                  { name: 'Mar', collected: stats.totalCollected, pending: stats.totalPending }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="collected" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={40} />
                  <Bar dataKey="pending" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-8">
            <h3 className="text-lg font-bold text-[#1E293B] mb-8">Maintenance Status</h3>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Paid', value: stats.paidFlats },
                      { name: 'Unpaid', value: stats.totalFlats - stats.paidFlats }
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    <Cell fill="#2563EB" />
                    <Cell fill="#F1F5F9" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-black text-[#1E293B]">{Math.round((stats.paidFlats / stats.totalFlats) * 100)}%</p>
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Paid</p>
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-bold text-[#1E293B]">Paid Flats</span>
                </div>
                <span className="text-sm font-black text-[#1E293B]">{stats.paidFlats}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-sm font-bold text-[#1E293B]">Unpaid Flats</span>
                </div>
                <span className="text-sm font-black text-[#1E293B]">{stats.totalFlats - stats.paidFlats}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Emergency Alert Card */}
        <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-rose-900">Emergency Alert System</h4>
              <p className="text-sm text-rose-700">Quickly broadcast emergency messages to all residents in case of fire, medical, or security issues.</p>
            </div>
          </div>
          <Button variant="danger" className="hidden sm:flex">
            Broadcast Alert
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="p-10 bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-blue-200">
        <div className="relative z-10 max-w-2xl">
          <Badge variant="info" className="bg-white/20 text-white border-white/30 mb-4">Welcome Back</Badge>
          <h2 className="text-4xl font-black tracking-tight mb-2">Hello, {user.name}! 👋</h2>
          <p className="text-blue-50/80 text-lg font-medium">Your society management dashboard is up to date. You have 3 new notifications to review.</p>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <p className="text-[10px] text-blue-100/60 uppercase font-black tracking-widest mb-1">Society Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-lg font-bold">All Systems Normal</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <p className="text-[10px] text-blue-100/60 uppercase font-black tracking-widest mb-1">Active Alerts</p>
              <p className="text-lg font-bold">0 Emergency Alerts</p>
            </div>
          </div>
        </div>
        <Building2 className="absolute -right-12 -bottom-12 w-80 h-80 text-white/10 rotate-12" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <h3 className="font-bold text-[#1E293B]">Upcoming Events</h3>
            </div>
            <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            <EventItem title="Annual General Meeting" date="March 15, 2026" />
            <EventItem title="Holi Celebration" date="March 22, 2026" />
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <h3 className="font-bold text-[#1E293B]">Recent Complaints</h3>
            </div>
            <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1E293B]">Elevator Maintenance</p>
                <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mt-0.5">Tower A • 2h ago</p>
              </div>
              <Badge variant="warning">Pending</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1E293B]">Water Leakage</p>
                <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mt-0.5">Flat 402 • 5h ago</p>
              </div>
              <Badge variant="success">Resolved</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-[#1E293B]">Visitor Activity</h3>
            </div>
            <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">R</div>
              <div>
                <p className="text-sm font-bold text-[#1E293B]">Rahul Sharma</p>
                <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Delivery • 10:45 AM</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">A</div>
              <div>
                <p className="text-sm font-bold text-[#1E293B]">Amit Patel</p>
                <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Guest • 09:30 AM</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, borderColor }: { icon: React.ReactNode, label: string, value: any, color: string, borderColor: string }) {
  return (
    <Card className={cn("p-6 border-l-4", borderColor)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-black text-[#1E293B]">{value}</p>
        </div>
        <div className={cn("p-3 rounded-2xl shadow-sm", color)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function EventItem({ title, date }: { title: string, date: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{date}</p>
      </div>
    </div>
  );
}

// --- Admin Views ---

function AdminFlatsView({ apiFetch }: { apiFetch: any }) {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/flats').then((res: any) => res.json()).then(setFlats);
  }, []);

  const filteredFlats = flats.filter(f => {
    const matchesTower = filter === 'All' || f.tower === filter;
    const matchesSearch = f.id.toLowerCase().includes(search.toLowerCase()) || f.owner_name.toLowerCase().includes(search.toLowerCase());
    return matchesTower && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          {['All', 'A', 'B', 'C', 'D'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                filter === t 
                  ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200" 
                  : "text-[#64748B] hover:bg-slate-50 hover:text-[#1E293B]"
              )}
            >
              Tower {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search flat or owner..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredFlats.map(flat => (
          <Card key={flat.id} className="p-6 group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {flat.id}
              </div>
              <Badge variant={flat.maintenance_status === 'Paid' ? 'success' : 'danger'}>
                {flat.maintenance_status}
              </Badge>
            </div>
            <h4 className="font-bold text-[#1E293B] mb-1">{flat.owner_name}</h4>
            <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest mb-6">Tower {flat.tower} • Floor {flat.floor}</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="text-[10px] py-2 flex-1">History</Button>
              <Button variant="ghost" className="text-[10px] py-2 flex-1">Edit</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminMaintenanceView({ apiFetch }: { apiFetch: any }) {
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    apiFetch('/api/admin/bills').then((res: any) => res.json()).then(setBills);
  }, []);

  const generateBills = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/admin/generate-bills', { 
        method: 'POST',
        body: JSON.stringify({
          month: format(new Date(), 'MMMM yyyy'),
          amount: 1500,
          dueDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 10), 'yyyy-MM-dd')
        })
      });
      const res = await apiFetch('/api/admin/bills');
      const data = await res.json();
      setBills(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-[#1E293B]">Maintenance Management</h3>
          <p className="text-sm text-[#64748B]">Manage society maintenance bills and tracking</p>
        </div>
        <Button onClick={generateBills} disabled={loading}>
          {loading ? <Clock className="animate-spin" /> : <Plus size={18} />}
          Generate Monthly Bills
        </Button>
      </div>

      <Card>
        <Table headers={['Flat ID', 'Amount', 'Month', 'Due Date', 'Status', 'Action']}>
          {bills.map(bill => (
            <TableRow key={bill.id}>
              <TableCell className="font-bold">{bill.flat_id}</TableCell>
              <TableCell className="font-black">₹{bill.amount.toLocaleString()}</TableCell>
              <TableCell>{bill.month}</TableCell>
              <TableCell>{format(new Date(bill.due_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                <Badge variant={bill.status === 'Paid' ? 'success' : 'warning'}>
                  {bill.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" className="text-[10px] py-1 px-3">Send Reminder</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </div>
  );
}

function AdminAlertsView({ apiFetch }: { apiFetch: any }) {
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
      await apiFetch('/api/admin/alerts', {
        method: 'POST',
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
    <div className="max-w-2xl mx-auto py-8">
      <Card className="p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#1E293B]">Create Emergency Alert</h3>
            <p className="text-sm text-[#64748B]">Broadcast urgent messages to residents</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Target Tower</label>
              <select name="tower" className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm appearance-none">
                <option value="All">All Towers</option>
                <option value="A">Tower A</option>
                <option value="B">Tower B</option>
                <option value="C">Tower C</option>
                <option value="D">Tower D</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Severity</label>
              <select name="severity" className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm appearance-none">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Alert Title</label>
            <input name="title" required type="text" className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm" placeholder="e.g., Water Supply Interruption" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Message</label>
            <textarea name="message" required rows={4} className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm" placeholder="Detailed message for residents..." />
          </div>
          <Button disabled={loading} className="w-full py-4 shadow-lg shadow-rose-100 bg-rose-600 hover:bg-rose-700">
            {loading ? <Clock className="animate-spin" /> : <Send size={18} />}
            Broadcast Alert
          </Button>
        </form>
      </Card>
    </div>
  );
}

function AdminEventsView({ apiFetch }: { apiFetch: any }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/events').then((res: any) => res.json()).then(setEvents);
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
      await apiFetch('/api/admin/events', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const res = await apiFetch('/api/events');
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="p-8 lg:col-span-1 h-fit">
        <h3 className="text-xl font-black text-[#1E293B] mb-2">Add New Event</h3>
        <p className="text-sm text-[#64748B] mb-8">Schedule a new society event</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Event Title</label>
            <input name="title" required type="text" className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm" placeholder="e.g., Annual General Meeting" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Date</label>
            <input name="date" required type="date" className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Description</label>
            <textarea name="description" required rows={3} className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm" placeholder="Brief details about the event..." />
          </div>
          <Button disabled={loading} className="w-full py-4 shadow-lg shadow-blue-200">
            {loading ? <Clock className="animate-spin" /> : <Plus size={18} />}
            Create Event
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-black text-[#1E293B]">Upcoming Events</h3>
          <Badge variant="info">{events.length} Scheduled</Badge>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {events.map(event => (
            <Card key={event.id} className="p-6 flex items-center gap-8 group hover:border-blue-200 transition-all">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex flex-col items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">{format(new Date(event.date), 'MMM')}</span>
                <span className="text-3xl font-black">{format(new Date(event.date), 'dd')}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-[#1E293B] mb-1">{event.title}</h4>
                <p className="text-sm text-[#64748B] leading-relaxed line-clamp-2">{event.description}</p>
              </div>
              <Button variant="ghost" className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={20} />
              </Button>
            </Card>
          ))}
          {events.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Calendar className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 font-bold">No events scheduled.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminLogsView({ apiFetch }: { apiFetch: any }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    apiFetch('/api/admin/logs').then((res: any) => res.json()).then(setLogs);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-black text-[#1E293B]">System Activity Logs</h3>
        <p className="text-sm text-[#64748B]">Track all administrative and resident actions</p>
      </div>

      <Card>
        <Table headers={['Timestamp', 'User', 'Action', 'Details']}>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell className="text-xs text-[#64748B] font-medium">
                {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
              </TableCell>
              <TableCell className="font-bold text-[#1E293B]">{log.user_name}</TableCell>
              <TableCell>
                <Badge variant="info">{log.action}</Badge>
              </TableCell>
              <TableCell className="text-sm text-[#64748B]">{log.details}</TableCell>
            </TableRow>
          ))}
        </Table>
        <div className="p-6 border-t border-slate-50 flex justify-center">
          <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest">Load More Logs</Button>
        </div>
      </Card>
    </div>
  );
}

function AdminReportsView({ apiFetch }: { apiFetch: any }) {
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

  const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

  const exportCSV = () => {
    const headers = ["Category", "Budgeted", "Actual", "Variance", "Status"];
    const rows = [
      ["Security Services", 45000, 45000, 0, "Under"],
      ["Electrical Maintenance", 15000, 18500, 3500, "Over"],
      ["Water Supply", 20000, 19200, -800, "Under"],
      ["Cleaning & Hygiene", 12000, 12000, 0, "Under"]
    ];
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-[#1E293B]">Financial Reports</h3>
          <p className="text-sm text-[#64748B]">Detailed analysis of society finances</p>
        </div>
        <Button onClick={exportCSV}>
          <Download size={18} />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8">
          <h3 className="text-lg font-bold text-[#1E293B] mb-8">Income vs Expense Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="income" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="text-lg font-bold text-[#1E293B] mb-8">Expense Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-lg font-bold text-[#1E293B]">Budget Variance Analysis</h3>
        </div>
        <Table headers={['Category', 'Budgeted', 'Actual', 'Variance', 'Status']}>
          <ReportRow category="Security Services" budgeted={45000} actual={45000} />
          <ReportRow category="Electrical Maintenance" budgeted={15000} actual={18500} />
          <ReportRow category="Water Supply" budgeted={20000} actual={19200} />
          <ReportRow category="Cleaning & Hygiene" budgeted={12000} actual={12000} />
        </Table>
      </Card>
    </div>
  );
}

function ReportRow({ category, budgeted, actual }: { category: string, budgeted: number, actual: number }) {
  const variance = actual - budgeted;
  const isOver = variance > 0;

  return (
    <tr>
      <td className="py-4 font-medium text-slate-900 dark:text-white">{category}</td>
      <td className="py-4 text-slate-600 dark:text-slate-400">₹{budgeted.toLocaleString()}</td>
      <td className="py-4 text-slate-600 dark:text-slate-400">₹{actual.toLocaleString()}</td>
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

function ResidentBillsView({ user, apiFetch }: { user: User, apiFetch: any }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiFetch('/api/resident/dashboard').then((res: any) => res.json()).then(setData);
  }, [user]);

  if (!data) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  const unpaidAmount = data.flat.maintenance_status === 'Unpaid' ? 1500 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-black text-[#1E293B]">My Maintenance Bills</h3>
        <p className="text-sm text-[#64748B]">View and pay your society maintenance bills</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8 border-l-4 border-emerald-500">
          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Total Paid</p>
          <p className="text-3xl font-black text-[#1E293B]">₹{data.bills.filter((b: any) => b.status === 'Paid').reduce((acc: number, b: any) => acc + b.amount, 0).toLocaleString()}</p>
        </Card>
        <Card className="p-8 border-l-4 border-amber-500">
          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Outstanding</p>
          <p className="text-3xl font-black text-[#1E293B]">₹{unpaidAmount.toLocaleString()}</p>
        </Card>
        <Card className="p-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-200">
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Current Month</p>
          <p className="text-3xl font-black">₹1,500</p>
          {unpaidAmount > 0 && (
            <Button variant="secondary" className="w-full mt-4 py-2 text-xs font-bold text-blue-700">Pay Now</Button>
          )}
        </Card>
      </div>

      <Card>
        <Table headers={['Month', 'Amount', 'Due Date', 'Status', 'Action']}>
          {data.bills.map((bill: Bill) => (
            <TableRow key={bill.id}>
              <TableCell className="font-bold">{bill.month}</TableCell>
              <TableCell className="font-black">₹{bill.amount.toLocaleString()}</TableCell>
              <TableCell>{format(new Date(bill.due_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                <Badge variant={bill.status === 'Paid' ? 'success' : 'warning'}>
                  {bill.status}
                </Badge>
              </TableCell>
              <TableCell>
                {bill.status === 'Unpaid' ? (
                  <Button variant="primary" className="text-[10px] py-1 px-4">Pay Bill</Button>
                ) : (
                  <Button variant="ghost" className="text-[10px] py-1 px-4">
                    <Download size={14} />
                    Receipt
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </div>
  );
}

function ResidentComplaintsView({ user, apiFetch }: { user: User, apiFetch: any }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/resident/dashboard').then((res: any) => res.json()).then((data: any) => setComplaints(data.complaints));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category')
    };

    try {
      await apiFetch('/api/resident/complaints', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const res = await apiFetch('/api/resident/dashboard');
      const dashboardData = await res.json();
      setComplaints(dashboardData.complaints);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      alert("Failed to raise complaint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="p-8 lg:col-span-1 h-fit">
        <h3 className="text-xl font-black text-[#1E293B] mb-2">Raise a Complaint</h3>
        <p className="text-sm text-[#64748B] mb-8">Report issues to the society management</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Category</label>
            <select name="category" className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm appearance-none">
              <option value="Water">Water</option>
              <option value="Electricity">Electricity</option>
              <option value="Lift">Lift</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Issue Title</label>
            <input name="title" required type="text" className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm" placeholder="e.g., Leakage in Bathroom" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Description</label>
            <textarea name="description" required rows={4} className="w-full px-4 py-3 border border-slate-100 rounded-2xl outline-none bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm" placeholder="Describe the issue in detail..." />
          </div>
          <Button disabled={loading} className="w-full py-4 shadow-lg shadow-blue-200">
            {loading ? <Clock className="animate-spin" /> : <Send size={18} />}
            Submit Complaint
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-black text-[#1E293B]">Your Complaints</h3>
          <Badge variant="info">{complaints.length} Total</Badge>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {complaints.map(c => (
            <Card key={c.id} className="p-6 group hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-[#1E293B] text-lg mb-1">{c.title}</h4>
                  <div className="flex gap-2">
                    <Badge variant="neutral">{c.category}</Badge>
                    <Badge variant={c.status === 'Resolved' ? 'success' : 'warning'}>{c.status}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    <span>{format(new Date(c.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">{c.description}</p>
            </Card>
          ))}
          {complaints.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageSquare className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 font-bold">No complaints raised yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResidentBookingsView({ user, apiFetch }: { user: User, apiFetch: any }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/amenities/bookings').then((res: any) => res.json()).then(setBookings);
  }, []);

  const handleBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      amenity: formData.get('amenity'),
      date: formData.get('date'),
      timeSlot: formData.get('timeSlot')
    };

    try {
      const res = await apiFetch('/api/resident/book', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        const bRes = await apiFetch('/api/amenities/bookings');
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
      <Card className="p-6 lg:col-span-1 h-fit dark:bg-slate-800 dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4 dark:text-white">Book Amenity</h3>
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Amenity</label>
            <select name="amenity" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 dark:text-white">
              <option value="Clubhouse">Clubhouse</option>
              <option value="Gym">Gym</option>
              <option value="Swimming Pool">Swimming Pool</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input name="date" required type="date" min={format(new Date(), 'yyyy-MM-dd')} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time Slot</label>
            <select name="timeSlot" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 dark:text-white">
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
        <h3 className="text-lg font-bold dark:text-white">Society Bookings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map(b => (
            <Card key={b.id} className={cn("p-4 border-l-4 dark:bg-slate-800 dark:border-slate-700", b.flat_id === user.flat_id ? "border-l-red-600" : "border-l-slate-200 dark:border-l-slate-600")}>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-900 dark:text-white">{b.amenity}</h4>
                {b.flat_id === user.flat_id && <Badge variant="info">Your Booking</Badge>}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{format(new Date(b.date), 'PPP')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{b.time_slot}</p>
              <p className="text-[10px] text-slate-400 mt-2">Booked by Flat {b.flat_id}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResidentVisitorsView({ user, apiFetch }: { user: User, apiFetch: any }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    apiFetch('/api/resident/dashboard').then((res: any) => res.json()).then((data: any) => setVisitors(data.visitors));
  }, [user]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold dark:text-white">Visitor History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="py-3 font-semibold text-slate-500 dark:text-slate-400 text-sm">Visitor Name</th>
              <th className="py-3 font-semibold text-slate-500 dark:text-slate-400 text-sm">Entry Time</th>
              <th className="py-3 font-semibold text-slate-500 dark:text-slate-400 text-sm">Exit Time</th>
              <th className="py-3 font-semibold text-slate-500 dark:text-slate-400 text-sm text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {visitors.map(v => (
              <tr key={v.id}>
                <td className="py-4 font-medium text-slate-900 dark:text-white">{v.name}</td>
                <td className="py-4 text-slate-600 dark:text-slate-300 text-sm">{format(new Date(v.entry_time), 'PPP p')}</td>
                <td className="py-4 text-slate-600 dark:text-slate-300 text-sm">{v.exit_time ? format(new Date(v.exit_time), 'PPP p') : '-'}</td>
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

function SecurityVisitorsView({ apiFetch }: { apiFetch: any }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    apiFetch('/api/security/visitors').then((res: any) => res.json()).then(setVisitors);
  }, []);

  const handleExit = async (id: number) => {
    await apiFetch('/api/security/visitor-exit', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
    const res = await apiFetch('/api/security/visitors');
    setVisitors(await res.json());
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold dark:text-white">Daily Visitor Log</h3>
        <Badge variant="info">{visitors.filter(v => v.status === 'In').length} Currently Inside</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visitors.map(v => (
          <Card key={v.id} className="p-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{v.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Flat {v.flat_id} (Tower {v.tower})</p>
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

function SecurityNewEntryView({ apiFetch }: { apiFetch: any }) {
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
      await apiFetch('/api/security/visitor-entry', {
        method: 'POST',
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
      <Card className="p-8 dark:bg-slate-800 dark:border-slate-700">
        <h3 className="text-xl font-bold mb-6 dark:text-white">Record New Visitor</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Visitor Name</label>
            <input name="name" required type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="Full Name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tower</label>
              <select name="tower" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 dark:text-white">
                <option value="A">Tower A</option>
                <option value="B">Tower B</option>
                <option value="C">Tower C</option>
                <option value="D">Tower D</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Flat Number</label>
              <input name="flatId" required type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="e.g., A-101" />
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex gap-3">
            <MapPin className="text-slate-400 shrink-0" size={20} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Entry time will be automatically recorded as {format(new Date(), 'p')}.</p>
          </div>
          <Button disabled={loading} className="w-full py-3">
            {loading ? "Recording..." : "Check In Visitor"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
