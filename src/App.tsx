import React, { useState, useEffect } from 'react';
import { User, Resident, MaintenanceRecord, Complaint, Booking } from './types';
import { initialResidents, initialMaintenance, initialComplaints, initialBookings } from './data';
import { societyService } from './lib/societyService';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AdminDashboard from './components/AdminDashboard';
import ResidentDashboard from './components/ResidentDashboard';
import { Toaster } from 'sonner';
import { Users } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // App State
  const [residents, setResidents] = useState<Resident[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Fetch data from Supabase
  const fetchData = async () => {
    setLoading(true);

    if (!isSupabaseConfigured) {
      setResidents(initialResidents.filter(r => r.resident_id !== 'R081' && r.name.toLowerCase() !== 'dhilipan'));
      setMaintenance(initialMaintenance);
      setComplaints(initialComplaints);
      setBookings(initialBookings);
      setLoading(false);
      return;
    }

    try {
      const [resData, mainData, compData, bookingData] = await Promise.all([
        societyService.getResidents(),
        societyService.getMaintenance(),
        societyService.getComplaints(),
        societyService.getBookings()
      ]);
      
      const uniqueResidents = Array.from(new Map(resData.map(r => [r.resident_id, r])).values())
        .filter(r => r.resident_id !== 'R081' && r.name.toLowerCase() !== 'dhilipan');
      setResidents(uniqueResidents);
      setMaintenance(mainData || []);
      setComplaints(compData || []);
      setBookings(bookingData || []);
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      // Fallback to initial data for prototype if Supabase tables are not set up
      setResidents(initialResidents.filter(r => r.resident_id !== 'R081' && r.name.toLowerCase() !== 'dhilipan'));
      setMaintenance(initialMaintenance);
      setComplaints(initialComplaints);
      setBookings(initialBookings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time updates with Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Scroll to top on tab change or login
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, user?.id]);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const foundResident = user.resident_id 
    ? residents.find(r => r.resident_id === user.resident_id) 
    : null;

  const currentResident = foundResident ? {
    ...foundResident,
    flat: foundResident.flat || user.flat || '',
    tower: foundResident.tower || user.tower || '',
    resident_id: foundResident.resident_id || user.resident_id || ''
  } : (user.resident_id ? (user as unknown as Resident) : null);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Toaster position="top-center" richColors />
      <SpeedInsights />
      {!isSupabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-2 text-[10px] z-[9999] shadow-lg flex items-center justify-between font-black uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>Prototype Mode: Using local sample data</span>
          </div>
          <button 
            onClick={() => alert('To connect Supabase:\n1. Open the "Secrets" panel in AI Studio.\n2. Add VITE_SUPABASE_URL (your project URL).\n3. Add VITE_SUPABASE_ANON_KEY (your anon key).\n4. The app will automatically sync once configured.')}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-[10px] font-black transition-colors"
          >
            Setup Instructions
          </button>
        </div>
      )}
      <Sidebar 
        isAdmin={!!user.admin_id} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header user={user} />

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-6 bg-[#F8FAFC]">
          {user.admin_id ? (
            <AdminDashboard 
              user={user}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              residents={residents}
              maintenance={maintenance}
              complaints={complaints}
              bookings={bookings}
              onRefresh={fetchData}
            />
          ) : currentResident ? (
            <ResidentDashboard 
              activeTab={activeTab}
              resident={currentResident}
              maintenance={maintenance}
              complaints={complaints}
              bookings={bookings}
              onRefresh={fetchData}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Resident Profile Not Found</h3>
              <p className="text-slate-500 max-w-md">
                We couldn't find your resident profile in the database. Please contact your society administrator.
              </p>
              <button 
                onClick={handleLogout}
                className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Logout & Try Again
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
