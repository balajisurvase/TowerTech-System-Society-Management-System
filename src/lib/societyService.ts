import { supabase } from './supabase';
import { api } from './api';
import { Resident, MaintenanceRecord, Complaint, Booking, Society, Admin, Amenity, Media } from '../types';
import { initialResidents, initialMaintenance, initialComplaints, initialBookings, initialAmenities } from '../data';

// Helper to generate a UUID if needed
const generateUUID = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

export const societyService = {
  async getResidents() {
    try {
      const { data, error } = await supabase
        .from('resident')
        .select('*')
        .order('resident_id', { ascending: true });
      
      if (error) {
        return await api.residents.list();
      }
      return (data && data.length > 0) ? data as Resident[] : await api.residents.list();
    } catch (err) {
      try {
        return await api.residents.list();
      } catch {
        return initialResidents;
      }
    }
  },

  async getResidentByEmail(email: string) {
    const { data, error } = await supabase
      .from('resident')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching resident by email:', error);
      return null;
    }
    return data as Resident | null;
  },

  async createSocietyAccount(societyData: Omit<Society, 'society_id'>, adminPassword: string) {
    // 1. Generate Society ID: SOC2026XXXX
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const society_id = `SOC2026${randomDigits}`;

    let society = { ...societyData, society_id };

    // 2. Try to insert into society table, but don't fail if it doesn't exist
    try {
      const { data: societyResult, error: societyError } = await supabase
        .from('society')
        .insert([{ ...societyData, society_id }])
        .select();
      
      if (!societyError && societyResult && societyResult.length > 0) {
        society = societyResult[0];
      }
    } catch (err) {
      console.warn('Society table might be missing, skipping society record creation:', err);
    }

    // 3. Create first admin account in admin table
    const adminData = {
      admin_id: `A001`,
      name: `Admin - ${societyData.name}`,
      email: societyData.admin_email,
      phone: societyData.phone,
      password: adminPassword,
      society_id: society_id,
      role: 'admin'
    };

    const { data: admin, error: adminError } = await supabase
      .from('admin')
      .insert([adminData])
      .select();

    if (adminError) {
      console.error('Admin creation error:', adminError);
      throw adminError;
    }

    return { society, admin: admin ? admin[0] : null };
  },

  async updateAdminProfile(society_id: string, admin_id: string, updates: Partial<Admin>) {
    const { data, error } = await supabase
      .from('admin')
      .update(updates)
      .eq('society_id', society_id)
      .eq('admin_id', admin_id)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] as Admin : null;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return { success: true };
  },

  async getResidentMaintenance(resident_id: string, society_id?: string) {
    let query = supabase
      .from('maintenance')
      .select('*')
      .eq('resident_id', resident_id);
    
    if (society_id) {
      query = query.eq('society_id', society_id);
    }

    const { data, error } = await query.order('due_date', { ascending: false });
    
    if (error) {
      // Fallback: if column doesn't exist, try to fetch all and filter in memory
      if (error.code === '42703' || error.message?.includes('resident_id')) {
        const { data: allData, error: allErr } = await supabase.from('maintenance').select('*');
        if (allErr) return [] as MaintenanceRecord[];
        return (allData || []).filter((m: any) => m.resident_id === resident_id) as MaintenanceRecord[];
      }
      console.error('Error fetching resident maintenance:', error);
      return [] as MaintenanceRecord[];
    }
    return data as MaintenanceRecord[];
  },

  async getMaintenance() {
    try {
      const { data, error } = await supabase
        .from('maintenance')
        .select('*')
        .order('due_date', { ascending: false });
      
      if (error) {
        return await api.maintenance.list();
      }
      return (data && data.length > 0) ? data as MaintenanceRecord[] : await api.maintenance.list();
    } catch (err) {
      try {
        return await api.maintenance.list();
      } catch {
        return initialMaintenance;
      }
    }
  },

  async updateMaintenanceStatus(maintenance_id: string, status: 'Paid' | 'Unpaid') {
    const updates: any = { status };
    if (status === 'Paid') {
      updates.payment_date = new Date().toISOString();
    } else {
      updates.payment_date = null;
    }

    const { data, error } = await supabase
      .from('maintenance')
      .update(updates)
      .eq('maintenance_id', maintenance_id)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] as MaintenanceRecord : null;
  },

  async createMaintenanceBill(bill: Omit<MaintenanceRecord, 'id' | 'maintenance_id'>) {
    // Check for duplicate bill for the same flat and month
    const { data: existingBills, error: checkError } = await supabase
      .from('maintenance')
      .select('maintenance_id')
      .eq('society_id', bill.society_id)
      .eq('tower', bill.tower)
      .eq('flat_no', bill.flat_no)
      .eq('month', bill.month);

    if (checkError && checkError.code !== '42703') throw checkError;
    if (existingBills && existingBills.length > 0) {
      throw new Error(`Maintenance bill already generated for flat ${bill.flat_no} in ${bill.month}`);
    }

    // Generate a sequential-like ID
    const { count } = await supabase.from('maintenance').select('*', { count: 'exact', head: true });
    const nextNum = (count || 0) + 1;
    const maintenance_id = `M${nextNum.toString().padStart(3, '0')}`;
    const rawId = generateUUID();

    const billWithId = { 
      ...bill, 
      id: rawId, 
      maintenance_id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('maintenance')
      .insert([billWithId])
      .select();
    
    if (error) {
      // If invalid UUID syntax (22P02), retry with plain UUID for maintenance_id
      if (error.code === '22P02') {
        const { data: retryData, error: retryError } = await supabase
          .from('maintenance')
          .insert([{ ...billWithId, maintenance_id: rawId }])
          .select();
        if (retryError) throw retryError;
        return retryData[0] as MaintenanceRecord;
      }

      // If columns are missing or NOT NULL constraint violated, try to insert without them
      if (error.code === '42703' || error.code === 'PGRST204' || error.code === '23502' || error.message?.includes('column') || error.message?.includes('null value')) {
        // Strip out fields that are often missing in simpler schemas, 
        // but KEEP mandatory ones like resident_id if possible
        const { 
          generated_by, 
          admin_id, 
          ...minimalBill 
        } = bill as any;
        
        const { data: retryData, error: retryError } = await supabase
          .from('maintenance')
          .insert([{ ...minimalBill, id: generateUUID(), maintenance_id }])
          .select();
        
        if (retryError) {
          console.error('Error creating maintenance bill after retry:', retryError);
          // If still failing, try even more minimal (just the basics)
          if (retryError.code === '42703' || retryError.code === 'PGRST204' || retryError.code === '23502' || retryError.message?.includes('column') || retryError.message?.includes('null value')) {
            const superMinimalBill = {
              id: generateUUID(),
              maintenance_id,
              resident_id: bill.resident_id,
              resident_name: bill.resident_name,
              flat_no: bill.flat_no,
              month: bill.month,
              amount: bill.amount,
              status: bill.status,
              due_date: bill.due_date,
              society_id: bill.society_id
            };
            const { data: finalData, error: finalError } = await supabase
              .from('maintenance')
              .insert([superMinimalBill])
              .select();
            
            if (finalError) throw finalError;
            return finalData[0] as MaintenanceRecord;
          }
          throw retryError;
        }
        return retryData[0] as MaintenanceRecord;
      }
      console.error('Error creating maintenance bill:', error);
      throw error;
    }
    return data[0] as MaintenanceRecord;
  },

  async createBulkMaintenanceBills(bills: Omit<MaintenanceRecord, 'id' | 'maintenance_id'>[]) {
    if (bills.length === 0) return [];

    // Check for existing bills to avoid duplicates in bulk
    const { data: existingBills, error: checkError } = await supabase
      .from('maintenance')
      .select('tower, flat_no, month, society_id')
      .eq('society_id', bills[0].society_id)
      .in('month', [...new Set(bills.map(b => b.month))]);

    const existingMap = new Set((existingBills || []).map(b => `${b.tower}-${b.flat_no}-${b.month}`));
    
    const newBills = bills.filter(b => !existingMap.has(`${b.tower}-${b.flat_no}-${b.month}`));
    
    if (newBills.length === 0) {
      throw new Error('All selected residents already have bills for this month.');
    }

    const { count } = await supabase.from('maintenance').select('*', { count: 'exact', head: true });
    let currentCount = count || 0;

    const billsWithIds = newBills.map((bill) => {
      currentCount++;
      const rawId = generateUUID();
      const maintenance_id = `M${currentCount.toString().padStart(3, '0')}`;
      
      return {
        ...bill,
        id: rawId,
        maintenance_id,
        created_at: new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('maintenance')
      .insert(billsWithIds)
      .select();

    if (error) {
      // If invalid UUID syntax (22P02), retry with plain UUID for maintenance_id
      if (error.code === '22P02') {
        const plainBills = billsWithIds.map(b => ({ ...b, maintenance_id: b.id }));
        const { data: retryData, error: retryError } = await supabase
          .from('maintenance')
          .insert(plainBills)
          .select();
        if (retryError) throw retryError;
        return retryData as MaintenanceRecord[];
      }
      // If columns are missing, try to insert without them
      if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('column')) {
        const minimalBills = billsWithIds.map(bill => {
          const { generated_by, admin_id, ...rest } = bill as any;
          return rest;
        });
        
        const { data: retryData, error: retryError } = await supabase
          .from('maintenance')
          .insert(minimalBills)
          .select();
        
        if (retryError) {
          // Try even more minimal if it still fails
          if (retryError.code === '42703' || retryError.code === 'PGRST204' || retryError.message?.includes('column')) {
            const superMinimalBills = billsWithIds.map(bill => ({
              id: bill.id,
              maintenance_id: bill.maintenance_id,
              resident_id: bill.resident_id,
              resident_name: bill.resident_name,
              flat_no: bill.flat_no,
              tower: bill.tower,
              month: bill.month,
              amount: bill.amount,
              status: bill.status,
              due_date: bill.due_date,
              society_id: bill.society_id
            }));
            
            const { data: finalData, error: finalError } = await supabase
              .from('maintenance')
              .insert(superMinimalBills)
              .select();
            
            if (finalError) throw finalError;
            return finalData as MaintenanceRecord[];
          }
          throw retryError;
        }
        return retryData as MaintenanceRecord[];
      }
      console.error('Error creating bulk maintenance bills:', error);
      throw error;
    }

    return data as MaintenanceRecord[];
  },

  async getAmenities(society_id: string = 'GV2026') {
    try {
      const { data, error } = await supabase.from('amenities').select('*').eq('society_id', society_id).order('name', { ascending: true });
      if (error) {
        return await api.amenities.list(society_id);
      }
      return (data && data.length > 0) ? data as Amenity[] : await api.amenities.list(society_id);
    } catch (err) {
      try {
        return await api.amenities.list(society_id);
      } catch {
        return initialAmenities.filter(a => a.society_id === society_id);
      }
    }
  },

  async updateAmenity(amenity_id: string, updates: Partial<Amenity>) {
    const { data, error } = await supabase
      .from('amenities')
      .update(updates)
      .eq('amenity_id', amenity_id)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] as Amenity : null;
  },

  async deleteAmenity(amenity_id: string) {
    const { error } = await supabase
      .from('amenities')
      .delete()
      .eq('amenity_id', amenity_id);
    
    if (error) throw error;
    return { success: true };
  },

  async addAmenity(amenity: Omit<Amenity, 'id' | 'amenity_id'>) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const amenity_id = `AM-${timestamp}${random}`;

    const { data, error } = await supabase
      .from('amenities')
      .insert([{ ...amenity, amenity_id }])
      .select();
    
    if (error) {
      // If society_id column is missing, try without it
      if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('society_id')) {
        const { society_id, ...amenityWithoutSociety } = amenity as any;
        const { data: retryData, error: retryError } = await supabase
          .from('amenities')
          .insert([{ ...amenityWithoutSociety, amenity_id }])
          .select();
        if (retryError) throw retryError;
        return retryData && retryData.length > 0 ? retryData[0] as Amenity : null;
      }
      throw error;
    }
    return data && data.length > 0 ? data[0] as Amenity : null;
  },

  async getResidentComplaints(resident_id: string, society_id?: string) {
    let query = supabase
      .from('complaint')
      .select('*')
      .eq('resident_id', resident_id);
    
    if (society_id) {
      query = query.eq('society_id', society_id);
    }

    const { data: complaints, error } = await query.order('complaint_date', { ascending: false });
    
    if (error) {
      // Fallback: if resident_id column is missing, try to fetch all and filter in memory
      if (error.code === '42703' || error.message?.includes('resident_id')) {
        const { data: allData, error: allErr } = await supabase.from('complaint').select('*');
        if (allErr) return [] as Complaint[];
        const filtered = (allData || []).filter((c: any) => c.resident_id === resident_id);
        return await this.attachMediaToComplaints(filtered);
      }
      // If table is missing, return empty array
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return [] as Complaint[];
      }
      console.error('Error fetching resident complaints:', error);
      return [] as Complaint[];
    }
    
    return await this.attachMediaToComplaints(complaints || []);
  },

  async getComplaints() {
    try {
      const { data: complaints, error } = await supabase
        .from('complaint')
        .select('*')
        .order('complaint_date', { ascending: false });
      
      if (error) {
        const list = await api.complaints.list();
        return await this.attachMediaToComplaints(list || []);
      }
      const list = (complaints && complaints.length > 0) ? complaints : await api.complaints.list();
      return await this.attachMediaToComplaints(list || []);
    } catch (err) {
      try {
        const list = await api.complaints.list();
        return await this.attachMediaToComplaints(list || []);
      } catch {
        return initialComplaints;
      }
    }
  },

  async attachMediaToComplaints(complaints: any[]) {
    if (!complaints || complaints.length === 0) return [] as Complaint[];

    const complaintIds = complaints.map(c => c.complaint_id).filter(Boolean);
    const residentIds = complaints.map(c => c.resident_id).filter(Boolean);
    
    // Fetch media and residents in parallel
    const [mediaResult, residentsResult] = await Promise.all([
      supabase.from('media').select('*').in('complaint_id', complaintIds),
      supabase.from('resident').select('resident_id, name').in('resident_id', residentIds)
    ]);

    const media = mediaResult.data || [];
    const residents = residentsResult.data || [];

    return complaints.map(c => {
      const resident = residents.find(r => r.resident_id === c.resident_id);
      return {
        ...c,
        resident_name: resident?.name || 'Resident',
        media: media.filter(m => m.complaint_id === c.complaint_id) || []
      };
    }) as Complaint[];
  },

  async addComplaint(complaintData: Omit<Complaint, 'id' | 'complaint_id'>) {
    // Validation: resident_id, tower, flat_no are required
    if (!complaintData.resident_id || !complaintData.tower || !complaintData.flat_no) {
      throw new Error('Resident ID, Tower, and Flat Number are required for complaint submission.');
    }

    // Generate a sequential-like ID
    const { count } = await supabase.from('complaint').select('*', { count: 'exact', head: true });
    const nextNum = (count || 0) + 1;
    const complaint_id = `C${nextNum.toString().padStart(3, '0')}`;
    const rawId = generateUUID();

    // Prepare complaint data (remove media fields that might be in complaintData)
    const { media: mediaFromData, ...restOfComplaintData } = complaintData as any;

    const complaint = { 
      complaint_id,
      id: rawId,
      resident_id: complaintData.resident_id,
      tower: complaintData.tower,
      flat_no: complaintData.flat_no,
      category: complaintData.category,
      description: complaintData.description,
      status: complaintData.status,
      society_id: complaintData.society_id,
      complaint_date: complaintData.complaint_date || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('complaint')
      .insert([complaint])
      .select();
    
    if (error) {
      console.error('Error submitting complaint:', error);
      throw error;
    }
    
    const insertedComplaint = data && data.length > 0 ? data[0] as Complaint : null;

    // If media is present, save to media table
    // We check both mediaFromData (from Omit) and any other possible media URL source
    const mediaUrl = mediaFromData || (complaintData as any).media_url;
    if (mediaUrl && insertedComplaint) {
      await this.saveMedia({
        complaint_id: insertedComplaint.complaint_id,
        file_url: mediaUrl,
        uploaded_by: insertedComplaint.resident_id,
        society_id: insertedComplaint.society_id
      }).catch(err => console.warn('Failed to save to media table:', err));
    }
    
    return insertedComplaint;
  },

  async saveMedia(mediaData: Omit<Media, 'id' | 'media_id'>) {
    const media_id = `M-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { data, error } = await supabase
      .from('media')
      .insert([{ ...mediaData, media_id }])
      .select();
    
    if (error) {
      console.error('Error saving media record:', error);
      throw error;
    }
    return data && data.length > 0 ? data[0] as Media : null;
  },

  async updateComplaintStatus(complaint_id: string, status: Complaint['status'], comment?: string) {
    const updates: any = { status };
    if (comment) {
      updates.admin_comment = comment;
    }
    const { data, error } = await supabase
      .from('complaint')
      .update(updates)
      .eq('complaint_id', complaint_id)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] as Complaint : null;
  },

  async getBookings() {
    try {
      const { data, error } = await supabase
        .from('booking')
        .select('*')
        .order('booking_date', { ascending: false });
      
      if (error) {
        return await api.bookings.list();
      }
      return (data && data.length > 0) ? data as Booking[] : await api.bookings.list();
    } catch (err) {
      try {
        return await api.bookings.list();
      } catch {
        return initialBookings;
      }
    }
  },

  async getResidentBookings(resident_id: string, society_id?: string) {
    let query = supabase
      .from('booking')
      .select('*')
      .eq('resident_id', resident_id);
    
    if (society_id) {
      query = query.eq('society_id', society_id);
    }

    const { data, error } = await query.order('booking_date', { ascending: false });
    
    if (error) {
      // Fallback: if resident_id column is missing, try to fetch all and filter in memory
      if (error.code === '42703' || error.message?.includes('resident_id')) {
        const { data: allData, error: allErr } = await supabase.from('bookings').select('*');
        if (allErr) return [] as Booking[];
        return (allData || []).filter((b: any) => b.resident_id === resident_id) as Booking[];
      }
      // If table is missing, return empty array
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return [] as Booking[];
      }
      console.error('Error fetching resident bookings:', error);
      return [] as Booking[];
    }
    return data as Booking[];
  },

  async addBooking(booking: Omit<Booking, 'id' | 'booking_id'>) {
    // Generate a sequential-like ID
    const { count } = await supabase.from('booking').select('*', { count: 'exact', head: true });
    const nextNum = (count || 0) + 1;
    const booking_id = `B${nextNum.toString().padStart(3, '0')}`;
    const rawId = generateUUID();

    const bookingWithId = { 
      ...booking, 
      id: rawId,
      booking_id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('booking')
      .insert([bookingWithId])
      .select();
    
    if (error) {
      // If invalid UUID syntax (22P02), retry with plain UUID for booking_id
      if (error.code === '22P02') {
        const { data: retryData, error: retryError } = await supabase
          .from('booking')
          .insert([{ ...bookingWithId, booking_id: rawId }])
          .select();
        if (retryError) throw retryError;
        return retryData && retryData.length > 0 ? retryData[0] as Booking : null;
      }
      console.error('Error adding booking:', error);
      // If society_id or other columns are missing, or NOT NULL constraint violated, try to insert with minimal fields
      if (error.code === '42703' || error.code === 'PGRST204' || error.code === '23502' || error.message?.includes('society_id') || error.message?.includes('column') || error.message?.includes('null value')) {
        // Create a minimal version of the booking, but KEEP mandatory fields
        const minimalBooking: any = {
          id: generateUUID(),
          booking_id,
          resident_id: booking.resident_id,
          name: booking.name,
          tower: booking.tower,
          flat: booking.flat,
          amenity_name: booking.amenity_name,
          event_name: booking.event_name,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status,
          charges: booking.charges,
          society_id: booking.society_id
        };

        const { data: retryData, error: retryError } = await supabase
          .from('booking')
          .insert([minimalBooking])
          .select();
        
        if (retryError) {
          console.error('Retry booking failed:', retryError);
          // Try super minimal - only if absolutely necessary, but still keep mandatory fields
          if (retryError.code === '42703' || retryError.code === 'PGRST204' || retryError.code === '23502' || retryError.message?.includes('column') || retryError.message?.includes('null value')) {
            const superMinimalBooking = {
              id: generateUUID(),
              booking_id,
              resident_id: booking.resident_id,
              name: booking.name,
              amenity_name: booking.amenity_name,
              event_name: booking.event_name,
              booking_date: booking.booking_date,
              status: booking.status,
              society_id: booking.society_id
            };
            const { data: finalData, error: finalError } = await supabase
              .from('booking')
              .insert([superMinimalBooking])
              .select();
            if (finalError) throw finalError;
            return finalData && finalData.length > 0 ? finalData[0] as Booking : null;
          }
          throw retryError;
        }
        return retryData && retryData.length > 0 ? retryData[0] as Booking : null;
      }
      throw error;
    }
    return data && data.length > 0 ? data[0] as Booking : null;
  },

  async updateBookingStatus(booking_id: string, status: Booking['status'], comment?: string) {
    const updates: any = { status };
    if (comment) {
      updates.admin_comment = comment;
    }
    const { data, error } = await supabase
      .from('booking')
      .update(updates)
      .eq('booking_id', booking_id)
      .select();
    
    if (error) {
      // Fallback: if booking_id column is missing, try to update by id if possible
      if (error.code === '42703' || error.message?.includes('booking_id')) {
        const { data: retryData, error: retryError } = await supabase
          .from('booking')
          .update(updates)
          .eq('id', booking_id)
          .select();
        if (retryError) throw retryError;
        return retryData && retryData.length > 0 ? retryData[0] as Booking : null;
      }
      throw error;
    }
    return data && data.length > 0 ? data[0] as Booking : null;
  },

  async updateBooking(booking_id: string, updates: Partial<Booking>) {
    const { data, error } = await supabase
      .from('booking')
      .update(updates)
      .eq('booking_id', booking_id)
      .select();
    
    if (error) {
      // Fallback: if booking_id column is missing, try to update by id if possible
      if (error.code === '42703' || error.message?.includes('booking_id')) {
        const { data: retryData, error: retryError } = await supabase
          .from('booking')
          .update(updates)
          .eq('id', booking_id)
          .select();
        if (retryError) throw retryError;
        return retryData && retryData.length > 0 ? retryData[0] as Booking : null;
      }
      throw error;
    }
    return data && data.length > 0 ? data[0] as Booking : null;
  },

  async updateResident(resident_id: string, updates: Partial<Resident>) {
    const { data, error } = await supabase
      .from('resident')
      .update(updates)
      .eq('resident_id', resident_id)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] as Resident : null;
  },

  async addResident(resident: Omit<Resident, 'id'>) {
    let residentData = { ...resident };
    
    if (!residentData.resident_id) {
      const timestamp = Date.now().toString().slice(-4);
      const random = Math.floor(100 + Math.random() * 900);
      residentData.resident_id = `R-${timestamp}${random}`;
    }

    const { data, error } = await supabase
      .from('resident')
      .insert([residentData])
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] as Resident : null;
  },

  async deleteResident(resident_id: string) {
    const { error } = await supabase
      .from('resident')
      .delete()
      .eq('resident_id', resident_id);
    
    if (error) throw error;
    return { success: true };
  },

  async deleteMaintenanceRecord(id: string) {
    // Check if id is a valid UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    
    let query = supabase.from('maintenance').delete();
    
    if (isUUID) {
      query = query.or(`maintenance_id.eq.${id},id.eq.${id}`);
    } else {
      query = query.eq('maintenance_id', id);
    }
    
    const { error } = await query;
    
    if (error) throw error;
    return { success: true };
  },
  
  async deleteComplaint(id: string) {
    // Check if id is a valid UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    // Check if id is a number (for bigint)
    const isNumber = /^\d+$/.test(id);
    
    let query = supabase.from('complaint').delete();
    
    if (isUUID) {
      query = query.or(`complaint_id.eq.${id},id.eq.${id}`);
    } else if (isNumber) {
      query = query.or(`complaint_id.eq.${id},id.eq.${id}`);
    } else {
      query = query.eq('complaint_id', id);
    }
    
    const { error } = await query;
    
    if (error) throw error;
    return { success: true };
  },

  async deleteBooking(id: string) {
    // Check if id is a valid UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    
    let query = supabase.from('booking').delete();
    
    if (isUUID) {
      query = query.or(`booking_id.eq.${id},id.eq.${id}`);
    } else {
      query = query.eq('booking_id', id);
    }
    
    const { error } = await query;
    
    if (error) throw error;
    return { success: true };
  },

  async deleteAllResidents(society_id: string) {
    const { error } = await supabase
      .from('resident')
      .delete()
      .eq('society_id', society_id);
    if (error) throw error;
    return { success: true };
  },

  async deleteAllComplaints(society_id: string) {
    const { error } = await supabase
      .from('complaint')
      .delete()
      .eq('society_id', society_id);
    if (error) throw error;
    return { success: true };
  },

  async deleteAllBookings(society_id: string) {
    const { error } = await supabase
      .from('booking')
      .delete()
      .eq('society_id', society_id);
    if (error) throw error;
    return { success: true };
  },

  async uploadMedia(file: File) {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = fileName;

    // Try these bucket names in order
    const buckets = ['complaint', 'complaints', 'media', 'public'];
    let lastError = null;

    for (const bucket of buckets) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (!uploadError) {
          const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          return data.publicUrl;
        }
        
        lastError = uploadError;
        // If it's not a "Bucket not found" error, don't bother trying other buckets
        if (!uploadError.message?.includes('Bucket not found')) {
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    console.error('Upload error after trying all buckets:', lastError);
    throw new Error('Storage bucket not found. Please create a public bucket named "complaint" in your Supabase Storage console to enable media uploads.');
  },

  async seedDatabase(initialResidents: Resident[], initialAdmins: any[], initialMaintenance: MaintenanceRecord[], initialComplaints: Complaint[], initialBookings: Booking[], initialAmenities: Amenity[]) {
    // Seed Residents
    const { error: resError } = await supabase.from('resident').upsert(initialResidents);
    if (resError) throw resError;

    // Seed Admins
    const { error: adminError } = await supabase.from('admin').upsert(initialAdmins);
    if (adminError) throw adminError;

    // Seed Maintenance
    const { error: mainError } = await supabase.from('maintenance').upsert(initialMaintenance);
    if (mainError) throw mainError;

    // Seed Complaints
    const { error: compError } = await supabase.from('complaint').upsert(initialComplaints);
    if (compError) throw compError;

    // Seed Bookings
    const { error: bookingError } = await supabase.from('booking').upsert(initialBookings);
    if (bookingError) throw bookingError;

    // Seed Amenities
    const { error: amenityError } = await supabase.from('amenities').upsert(initialAmenities);
    if (amenityError) throw amenityError;

    return { success: true };
  }
};
