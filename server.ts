import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("society.db");
const JWT_SECRET = process.env.JWT_SECRET || "towertech-secret-key-2026";

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin', 'resident', 'security'
    flat_id TEXT,
    name TEXT,
    email TEXT UNIQUE,
    mobile_number TEXT,
    society_name TEXT
  );

  CREATE TABLE IF NOT EXISTS towers (
    id TEXT PRIMARY KEY,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS flats (
    id TEXT PRIMARY KEY, -- e.g., 'A-101'
    tower_id TEXT,
    floor INTEGER,
    flat_number INTEGER,
    owner_name TEXT,
    maintenance_status TEXT DEFAULT 'Unpaid',
    FOREIGN KEY(tower_id) REFERENCES towers(id)
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_id TEXT,
    amount INTEGER,
    month TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'Unpaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flat_id) REFERENCES flats(id)
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_id TEXT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    category TEXT, -- 'Water', 'Electricity', 'Lift', 'Cleaning', 'Other'
    status TEXT DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Resolved'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flat_id) REFERENCES flats(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tower TEXT, -- 'All' or 'A', 'B', 'C', 'D'
    title TEXT,
    message TEXT,
    severity TEXT, -- 'Low', 'Medium', 'High'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_id TEXT,
    user_id INTEGER,
    amenity TEXT, -- 'Clubhouse', 'Gym', 'Swimming Pool'
    date TEXT,
    time_slot TEXT,
    status TEXT DEFAULT 'Confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flat_id) REFERENCES flats(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    tower TEXT,
    flat_id TEXT,
    entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    exit_time DATETIME,
    status TEXT DEFAULT 'In',
    FOREIGN KEY(flat_id) REFERENCES flats(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    amount INTEGER,
    date TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Initial Data
const seedData = async () => {
  const checkTowers = db.prepare("SELECT count(*) as count FROM towers").get() as { count: number };
  if (checkTowers.count === 0) {
    const towers = ['A', 'B', 'C', 'D'];
    const insertTower = db.prepare("INSERT INTO towers (id, name) VALUES (?, ?)");
    towers.forEach(t => insertTower.run(t, `Tower ${t}`));

    const insertFlat = db.prepare("INSERT INTO flats (id, tower_id, floor, flat_number, owner_name, maintenance_status) VALUES (?, ?, ?, ?, ?, ?)");
    
    const flatData = [
      // Tower A
      { id: 'A-101', name: 'Rahul Sharma', status: 'Paid' }, { id: 'A-102', name: 'Priya Deshmukh', status: 'Paid' }, { id: 'A-103', name: 'Amit Patil', status: 'Unpaid' }, { id: 'A-104', name: 'Sneha Kulkarni', status: 'Paid' },
      { id: 'A-201', name: 'Rohit Verma', status: 'Paid' }, { id: 'A-202', name: 'Anjali Joshi', status: 'Paid' }, { id: 'A-203', name: 'Kunal Mehta', status: 'Unpaid' }, { id: 'A-204', name: 'Pooja Chavan', status: 'Paid' },
      { id: 'A-301', name: 'Sagar Pawar', status: 'Paid' }, { id: 'A-302', name: 'Neha Singh', status: 'Paid' }, { id: 'A-303', name: 'Akash Gupta', status: 'Unpaid' }, { id: 'A-304', name: 'Riya Nair', status: 'Paid' },
      { id: 'A-401', name: 'Vivek Iyer', status: 'Paid' }, { id: 'A-402', name: 'Tanvi More', status: 'Paid' }, { id: 'A-403', name: 'Harsh Jain', status: 'Unpaid' }, { id: 'A-404', name: 'Kavita Rao', status: 'Paid' },
      { id: 'A-501', name: 'Aditya Kulkarni', status: 'Paid' }, { id: 'A-502', name: 'Meera Patil', status: 'Paid' }, { id: 'A-503', name: 'Nitin Sharma', status: 'Unpaid' }, { id: 'A-504', name: 'Sakshi Yadav', status: 'Paid' },
      { id: 'A-601', name: 'Abhishek Mishra', status: 'Paid' }, { id: 'A-602', name: 'Isha Kapoor', status: 'Paid' }, { id: 'A-603', name: 'Manoj Tiwari', status: 'Unpaid' }, { id: 'A-604', name: 'Komal Shah', status: 'Paid' },
      { id: 'A-701', name: 'Gaurav Reddy', status: 'Paid' }, { id: 'A-702', name: 'Shweta Naik', status: 'Paid' }, { id: 'A-703', name: 'Deepak Sinha', status: 'Unpaid' }, { id: 'A-704', name: 'Ananya Bhosale', status: 'Paid' },
      // Tower B
      { id: 'B-101', name: 'Rohan Kulkarni', status: 'Paid' }, { id: 'B-102', name: 'Shruti Patil', status: 'Paid' }, { id: 'B-103', name: 'Varun Malhotra', status: 'Unpaid' }, { id: 'B-104', name: 'Aarti Jadhav', status: 'Paid' },
      { id: 'B-201', name: 'Pratik Desai', status: 'Paid' }, { id: 'B-202', name: 'Nikita Sharma', status: 'Paid' }, { id: 'B-203', name: 'Sumit Choudhary', status: 'Unpaid' }, { id: 'B-204', name: 'Pooja Verma', status: 'Paid' },
      { id: 'B-301', name: 'Hemant Joshi', status: 'Paid' }, { id: 'B-302', name: 'Neha Bansal', status: 'Paid' }, { id: 'B-303', name: 'Rahul Yadav', status: 'Unpaid' }, { id: 'B-304', name: 'Snehal Patwardhan', status: 'Paid' },
      { id: 'B-401', name: 'Arjun Pillai', status: 'Paid' }, { id: 'B-402', name: 'Kavya Shetty', status: 'Paid' }, { id: 'B-403', name: 'Mayank Agarwal', status: 'Unpaid' }, { id: 'B-404', name: 'Ritu Chauhan', status: 'Paid' },
      { id: 'B-501', name: 'Tushar Naik', status: 'Paid' }, { id: 'B-502', name: 'Ankita More', status: 'Paid' }, { id: 'B-503', name: 'Siddharth Roy', status: 'Unpaid' }, { id: 'B-504', name: 'Monika Das', status: 'Paid' },
      { id: 'B-601', name: 'Karthik Rao', status: 'Paid' }, { id: 'B-602', name: 'Swati Mishra', status: 'Paid' }, { id: 'B-603', name: 'Pradeep Yadav', status: 'Unpaid' }, { id: 'B-604', name: 'Bhavana Nair', status: 'Paid' },
      { id: 'B-701', name: 'Vivek Soni', status: 'Paid' }, { id: 'B-702', name: 'Aishwarya Patil', status: 'Paid' }, { id: 'B-703', name: 'Manish Pandey', status: 'Unpaid' }, { id: 'B-704', name: 'Rupal Shah', status: 'Paid' },
      // Tower C
      { id: 'C-101', name: 'Ajay Kumar', status: 'Paid' }, { id: 'C-102', name: 'Shreya Kulkarni', status: 'Paid' }, { id: 'C-103', name: 'Mohit Jain', status: 'Unpaid' }, { id: 'C-104', name: 'Tanmay Patil', status: 'Paid' },
      { id: 'C-201', name: 'Akshay Deshmukh', status: 'Paid' }, { id: 'C-202', name: 'Nidhi Gupta', status: 'Paid' }, { id: 'C-203', name: 'Pankaj Sharma', status: 'Unpaid' }, { id: 'C-204', name: 'Sonal Mehta', status: 'Paid' },
      { id: 'C-301', name: 'Yash Thakur', status: 'Paid' }, { id: 'C-302', name: 'Pallavi Joshi', status: 'Paid' }, { id: 'C-303', name: 'Rakesh Yadav', status: 'Unpaid' }, { id: 'C-304', name: 'Kritika Iyer', status: 'Paid' },
      { id: 'C-401', name: 'Harshal Patil', status: 'Paid' }, { id: 'C-402', name: 'Divya Reddy', status: 'Paid' }, { id: 'C-403', name: 'Ankit Singh', status: 'Unpaid' }, { id: 'C-404', name: 'Megha Kulkarni', status: 'Paid' },
      { id: 'C-501', name: 'Suraj Pawar', status: 'Paid' }, { id: 'C-502', name: 'Vaishali More', status: 'Paid' }, { id: 'C-503', name: 'Lokesh Gupta', status: 'Unpaid' }, { id: 'C-504', name: 'Shalini Verma', status: 'Paid' },
      { id: 'C-601', name: 'Vishal Sharma', status: 'Paid' }, { id: 'C-602', name: 'Radhika Nair', status: 'Paid' }, { id: 'C-603', name: 'Bharat Soni', status: 'Unpaid' }, { id: 'C-604', name: 'Namrata Patil', status: 'Paid' },
      { id: 'C-701', name: 'Nilesh Jadhav', status: 'Paid' }, { id: 'C-702', name: 'Kajal Singh', status: 'Paid' }, { id: 'C-703', name: 'Pranav Mehta', status: 'Unpaid' }, { id: 'C-704', name: 'Ishita Kapoor', status: 'Paid' },
      // Tower D
      { id: 'D-101', name: 'Arvind Patil', status: 'Paid' }, { id: 'D-102', name: 'Seema Sharma', status: 'Paid' }, { id: 'D-103', name: 'Chirag Shah', status: 'Unpaid' }, { id: 'D-104', name: 'Priti Verma', status: 'Paid' },
      { id: 'D-201', name: 'Nikhil Reddy', status: 'Paid' }, { id: 'D-202', name: 'Asha Kulkarni', status: 'Paid' }, { id: 'D-203', name: 'Raj Malhotra', status: 'Unpaid' }, { id: 'D-204', name: 'Mitali Joshi', status: 'Paid' },
      { id: 'D-301', name: 'Tarun Desai', status: 'Paid' }, { id: 'D-302', name: 'Sheetal Patil', status: 'Paid' }, { id: 'D-303', name: 'Aman Gupta', status: 'Unpaid' }, { id: 'D-304', name: 'Bhakti More', status: 'Paid' },
      { id: 'D-401', name: 'Ritesh Singh', status: 'Paid' }, { id: 'D-402', name: 'Komal Naik', status: 'Paid' }, { id: 'D-403', name: 'Sahil Khan', status: 'Unpaid' }, { id: 'D-404', name: 'Manasi Pawar', status: 'Paid' },
      { id: 'D-501', name: 'Sandeep Sharma', status: 'Paid' }, { id: 'D-502', name: 'Kavita Yadav', status: 'Paid' }, { id: 'D-503', name: 'Ajinkya Patil', status: 'Unpaid' }, { id: 'D-504', name: 'Roshni Iyer', status: 'Paid' },
      { id: 'D-601', name: 'Sameer Joshi', status: 'Paid' }, { id: 'D-602', name: 'Pooja Kulkarni', status: 'Paid' }, { id: 'D-603', name: 'Lalit Jain', status: 'Unpaid' }, { id: 'D-604', name: 'Tanisha Rao', status: 'Paid' },
      { id: 'D-701', name: 'Harshit Gupta', status: 'Paid' }, { id: 'D-702', name: 'Rina Patil', status: 'Paid' }, { id: 'D-703', name: 'Anurag Singh', status: 'Unpaid' }, { id: 'D-704', name: 'Muskan Sharma', status: 'Paid' }
    ];

    flatData.forEach(flat => {
      const tower = flat.id.split('-')[0];
      const floor = parseInt(flat.id.split('-')[1][0]);
      const flatNum = parseInt(flat.id.split('-')[1].slice(1));
      insertFlat.run(flat.id, tower, floor, flatNum, flat.name, flat.status);
    });

    // Dummy Users with Hashed Passwords
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash("admin123", salt);
    const secPass = await bcrypt.hash("sec123", salt);
    const resPass = await bcrypt.hash("res123", salt);

    const insertUser = db.prepare("INSERT INTO users (username, password, role, flat_id, name, email, mobile_number, society_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    insertUser.run("admin", adminPass, "admin", null, "System Admin", "admin@towertech.com", "9876543210", "Green Valley Residency");
    insertUser.run("security", secPass, "security", null, "Gate Security", "security@towertech.com", "9876543211", "Green Valley Residency");
    insertUser.run("resident", resPass, "resident", "A-101", "Rahul Sharma", "rahul@example.com", "9876543212", "Green Valley Residency");
    insertUser.run("res-b101", resPass, "resident", "B-101", "Rohan Kulkarni", "rohan@example.com", "9876543213", "Green Valley Residency");

    // Generate initial bills based on status
    const insertBill = db.prepare("INSERT INTO bills (flat_id, amount, month, due_date, status) VALUES (?, ?, ?, ?, ?)");
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const dueDate = new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().split('T')[0];
    
    flatData.forEach(flat => {
      insertBill.run(flat.id, 1500, currentMonth, dueDate, flat.status);
    });

    // Seed some expenses for AI prediction
    const insertExpense = db.prepare("INSERT INTO expenses (category, amount, date, description) VALUES (?, ?, ?, ?)");
    const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];
    const baseExpense = 120000;
    months.forEach((m, i) => {
      const amount = baseExpense + (i * 5000) + (Math.random() * 2000);
      insertExpense.run("Maintenance", Math.floor(amount), `${m}-01`, `Monthly operational costs for ${m}`);
    });
  }
};

seedData();

// Middleware for Auth
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const logActivity = (userId: number, action: string, details: string) => {
  db.prepare("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)").run(userId, action, details);
};

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Routes
  app.post("/api/register", async (req, res) => {
    const { username, password, name, email, role, flatId, mobileNumber, societyName } = req.body;
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const result = db.prepare("INSERT INTO users (username, password, name, email, role, flat_id, mobile_number, society_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(username || email, hashedPassword, name, email, role || 'resident', flatId || null, mobileNumber || null, societyName || 'Green Valley Residency');
      
      logActivity(Number(result.lastInsertRowid), "REGISTER", "New user registered");
      res.json({ success: true, message: "Registration successful" });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ success: false, message: "Username or Email already exists" });
      } else {
        console.error(err);
        res.status(500).json({ success: false, message: "Registration failed" });
      }
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    const { email, societyName, newPassword } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ? AND society_name = ?").get(email, societyName) as any;
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found in this society" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
      
      logActivity(user.id, "FORGOT_PASSWORD", "Password reset successful");
      res.json({ success: true, message: "Password reset successful" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "Password reset failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password, societyName } = req.body;
    // We allow login via username or email
    const user = db.prepare("SELECT * FROM users WHERE (username = ? OR email = ?) AND society_name = ?").get(username, username, societyName) as any;
    
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, flat_id: user.flat_id }, JWT_SECRET, { expiresIn: '24h' });
      logActivity(user.id, "LOGIN", "User logged into the system");
      res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, name: user.name, flat_id: user.flat_id, society_name: user.society_name } });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Admin Routes
  app.get("/api/admin/flats", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const flats = db.prepare("SELECT * FROM flats").all();
    res.json(flats);
  });

  app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const totalFlats = db.prepare("SELECT count(*) as count FROM flats").get() as any;
    const paidFlats = db.prepare("SELECT count(*) as count FROM flats WHERE maintenance_status = 'Paid'").get() as any;
    const pendingComplaints = db.prepare("SELECT count(*) as count FROM complaints WHERE status != 'Resolved'").get() as any;
    const activeVisitors = db.prepare("SELECT count(*) as count FROM visitors WHERE status = 'In'").get() as any;
    
    const totalCollected = db.prepare("SELECT SUM(amount) as total FROM bills WHERE status = 'Paid'").get() as any;
    const totalPending = db.prepare("SELECT SUM(amount) as total FROM bills WHERE status = 'Unpaid'").get() as any;

    res.json({
      totalFlats: totalFlats.count,
      paidFlats: paidFlats.count,
      pendingComplaints: pendingComplaints.count,
      activeVisitors: activeVisitors.count,
      totalCollected: totalCollected.total || 0,
      totalPending: totalPending.total || 0
    });
  });

  app.get("/api/admin/ai-prediction", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const expenses = db.prepare("SELECT amount FROM expenses ORDER BY date DESC LIMIT 6").all() as any[];
    if (expenses.length < 2) return res.json({ suggestion: "Insufficient data", growth: 0 });

    const recent = expenses[0].amount;
    const previous = expenses[1].amount;
    const growth = ((recent - previous) / previous) * 100;
    
    let suggestion = "Maintain current maintenance fee.";
    if (growth > 10) {
      suggestion = "Expenses rose >10%. Suggest increasing maintenance by ₹200.";
    } else if (growth > 5) {
      suggestion = "Expenses rising steadily. Consider a ₹100 increase next quarter.";
    }

    res.json({ 
      recentExpense: recent,
      previousExpense: previous,
      growth: growth.toFixed(2),
      suggestion,
      confidence: 85 + Math.random() * 10
    });
  });

  app.post("/api/admin/generate-bills", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { month, amount, dueDate } = req.body;
    
    const checkExisting = db.prepare("SELECT id FROM bills WHERE month = ?").get(month);
    if (checkExisting) return res.status(400).json({ success: false, message: "Bills already generated for this month" });

    const flats = db.prepare("SELECT id FROM flats").all() as any[];
    const insertBill = db.prepare("INSERT INTO bills (flat_id, amount, month, due_date) VALUES (?, ?, ?, ?)");
    
    const transaction = db.transaction((flats) => {
      for (const flat of flats) {
        insertBill.run(flat.id, amount, month, dueDate);
      }
    });
    
    transaction(flats);
    logActivity(req.user.id, "GENERATE_BILLS", `Generated bills for ${month}`);
    res.json({ success: true, message: "Bills generated for all flats" });
  });

  app.post("/api/admin/mark-paid", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { flatId, billId } = req.body;
    db.prepare("UPDATE flats SET maintenance_status = 'Paid' WHERE id = ?").run(flatId);
    db.prepare("UPDATE bills SET status = 'Paid' WHERE id = ?").run(billId);
    logActivity(req.user.id, "MARK_PAID", `Marked bill ${billId} for flat ${flatId} as paid`);
    res.json({ success: true });
  });

  app.post("/api/admin/alerts", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { tower, title, message, severity } = req.body;
    db.prepare("INSERT INTO alerts (tower, title, message, severity) VALUES (?, ?, ?, ?)").run(tower, title, message, severity);
    logActivity(req.user.id, "CREATE_ALERT", `Created alert: ${title}`);
    res.json({ success: true });
  });

  app.post("/api/admin/events", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { title, description, date } = req.body;
    db.prepare("INSERT INTO events (title, description, date) VALUES (?, ?, ?)").run(title, description, date);
    logActivity(req.user.id, "CREATE_EVENT", `Created event: ${title}`);
    res.json({ success: true });
  });

  app.get("/api/admin/logs", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const logs = db.prepare(`
      SELECT l.*, u.name as user_name 
      FROM activity_logs l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.timestamp DESC LIMIT 50
    `).all();
    res.json(logs);
  });

  // Resident Routes
  app.get("/api/resident/dashboard", authenticateToken, (req: any, res) => {
    const flatId = req.user.flat_id;
    const flat = db.prepare("SELECT * FROM flats WHERE id = ?").get(flatId);
    const bills = db.prepare("SELECT * FROM bills WHERE flat_id = ? ORDER BY id DESC").all(flatId);
    const alerts = db.prepare("SELECT * FROM alerts WHERE tower = ? OR tower = 'All' ORDER BY created_at DESC LIMIT 5").all(flatId.split('-')[0]);
    const visitors = db.prepare("SELECT * FROM visitors WHERE flat_id = ? ORDER BY entry_time DESC LIMIT 10").all(flatId);
    const complaints = db.prepare("SELECT * FROM complaints WHERE flat_id = ? ORDER BY created_at DESC").all(flatId);
    
    res.json({ flat, bills, alerts, visitors, complaints });
  });

  app.post("/api/resident/complaints", authenticateToken, (req: any, res) => {
    const { title, description, category } = req.body;
    db.prepare("INSERT INTO complaints (flat_id, user_id, title, description, category) VALUES (?, ?, ?, ?, ?)")
      .run(req.user.flat_id, req.user.id, title, description, category);
    logActivity(req.user.id, "RAISE_COMPLAINT", `Raised complaint: ${title}`);
    res.json({ success: true });
  });

  app.post("/api/resident/book", authenticateToken, (req: any, res) => {
    const { amenity, date, timeSlot } = req.body;
    const existing = db.prepare("SELECT * FROM bookings WHERE amenity = ? AND date = ? AND time_slot = ?").get(amenity, date, timeSlot);
    if (existing) {
      return res.status(400).json({ success: false, message: "Slot already booked" });
    }
    db.prepare("INSERT INTO bookings (flat_id, user_id, amenity, date, time_slot) VALUES (?, ?, ?, ?, ?)")
      .run(req.user.flat_id, req.user.id, amenity, date, timeSlot);
    logActivity(req.user.id, "BOOK_AMENITY", `Booked ${amenity} for ${date}`);
    res.json({ success: true });
  });

  // Security Routes
  app.get("/api/security/visitors", authenticateToken, (req: any, res) => {
    const visitors = db.prepare("SELECT * FROM visitors ORDER BY entry_time DESC").all();
    res.json(visitors);
  });

  app.post("/api/security/visitor-entry", authenticateToken, (req: any, res) => {
    const { name, tower, flatId } = req.body;
    db.prepare("INSERT INTO visitors (name, tower, flat_id) VALUES (?, ?, ?)").run(name, tower, flatId);
    logActivity(req.user.id, "VISITOR_ENTRY", `Recorded entry for ${name} to ${flatId}`);
    res.json({ success: true });
  });

  app.post("/api/security/visitor-exit", authenticateToken, (req: any, res) => {
    const { id } = req.body;
    db.prepare("UPDATE visitors SET exit_time = CURRENT_TIMESTAMP, status = 'Out' WHERE id = ?").run(id);
    logActivity(req.user.id, "VISITOR_EXIT", `Recorded exit for visitor ID ${id}`);
    res.json({ success: true });
  });

  // Common
  app.get("/api/events", authenticateToken, (req, res) => {
    const events = db.prepare("SELECT * FROM events ORDER BY date ASC").all();
    res.json(events);
  });

  app.get("/api/alerts", authenticateToken, (req: any, res) => {
    const tower = req.user.role === 'resident' ? req.user.flat_id.split('-')[0] : 'All';
    const alerts = db.prepare("SELECT * FROM alerts WHERE tower = ? OR tower = 'All' ORDER BY created_at DESC").all(tower);
    res.json(alerts);
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
