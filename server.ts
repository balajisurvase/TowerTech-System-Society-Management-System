import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("society.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin', 'resident', 'security'
    flat_id TEXT,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS flats (
    id TEXT PRIMARY KEY, -- e.g., 'A-101'
    tower TEXT,
    floor INTEGER,
    flat_number INTEGER,
    owner_name TEXT,
    maintenance_status TEXT DEFAULT 'Unpaid'
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_id TEXT,
    amount INTEGER,
    month TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'Unpaid',
    FOREIGN KEY(flat_id) REFERENCES flats(id)
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_id TEXT,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    amenity TEXT, -- 'Clubhouse', 'Gym', 'Swimming Pool'
    date TEXT,
    time_slot TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    tower TEXT,
    flat_id TEXT,
    entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    exit_time DATETIME,
    status TEXT DEFAULT 'In'
  );
`);

// Seed Initial Data
const seedData = () => {
  const towers = ['A', 'B', 'C', 'D'];
  const floors = 7;
  const flatsPerFloor = 4;

  const checkFlats = db.prepare("SELECT count(*) as count FROM flats").get() as { count: number };
  if (checkFlats.count === 0) {
    const insertFlat = db.prepare("INSERT INTO flats (id, tower, floor, flat_number, owner_name) VALUES (?, ?, ?, ?, ?)");
    
    towers.forEach(tower => {
      for (let floor = 1; floor <= floors; floor++) {
        for (let flatNum = 1; flatNum <= flatsPerFloor; flatNum++) {
          const flatId = `${tower}-${floor}0${flatNum}`;
          insertFlat.run(flatId, tower, floor, flatNum, `Owner of ${flatId}`);
        }
      }
    });

    // Dummy Users
    const insertUser = db.prepare("INSERT INTO users (username, password, role, flat_id, name) VALUES (?, ?, ?, ?, ?)");
    insertUser.run("admin", "admin123", "admin", null, "System Admin");
    insertUser.run("security", "sec123", "security", null, "Gate Security");
    insertUser.run("resident", "res123", "resident", "A-101", "John Doe");
    insertUser.run("res-b101", "res123", "resident", "B-101", "Jane Smith");
  }
};

seedData();

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Admin Routes
  app.get("/api/admin/flats", (req, res) => {
    const flats = db.prepare("SELECT * FROM flats").all();
    res.json(flats);
  });

  app.get("/api/admin/stats", (req, res) => {
    const totalFlats = db.prepare("SELECT count(*) as count FROM flats").get() as any;
    const paidFlats = db.prepare("SELECT count(*) as count FROM flats WHERE maintenance_status = 'Paid'").get() as any;
    const pendingComplaints = db.prepare("SELECT count(*) as count FROM complaints WHERE status = 'Pending'").get() as any;
    const activeVisitors = db.prepare("SELECT count(*) as count FROM visitors WHERE status = 'In'").get() as any;
    
    res.json({
      totalFlats: totalFlats.count,
      paidFlats: paidFlats.count,
      pendingComplaints: pendingComplaints.count,
      activeVisitors: activeVisitors.count,
      totalCollected: paidFlats.count * 1500,
      totalPending: (totalFlats.count - paidFlats.count) * 1500
    });
  });

  app.post("/api/admin/generate-bills", (req, res) => {
    const { month, amount, dueDate } = req.body;
    const flats = db.prepare("SELECT id FROM flats").all() as any[];
    const insertBill = db.prepare("INSERT INTO bills (flat_id, amount, month, due_date) VALUES (?, ?, ?, ?)");
    
    const transaction = db.transaction((flats) => {
      for (const flat of flats) {
        insertBill.run(flat.id, amount, month, dueDate);
      }
    });
    
    transaction(flats);
    res.json({ success: true, message: "Bills generated for all flats" });
  });

  app.post("/api/admin/mark-paid", (req, res) => {
    const { flatId } = req.body;
    db.prepare("UPDATE flats SET maintenance_status = 'Paid' WHERE id = ?").run(flatId);
    db.prepare("UPDATE bills SET status = 'Paid' WHERE flat_id = ?").run(flatId);
    res.json({ success: true });
  });

  app.post("/api/admin/alerts", (req, res) => {
    const { tower, title, message, severity } = req.body;
    db.prepare("INSERT INTO alerts (tower, title, message, severity) VALUES (?, ?, ?, ?)").run(tower, title, message, severity);
    res.json({ success: true });
  });

  app.post("/api/admin/events", (req, res) => {
    const { title, description, date } = req.body;
    db.prepare("INSERT INTO events (title, description, date) VALUES (?, ?, ?)").run(title, description, date);
    res.json({ success: true });
  });

  // Resident Routes
  app.get("/api/resident/details/:flatId", (req, res) => {
    const flat = db.prepare("SELECT * FROM flats WHERE id = ?").get(req.params.flatId);
    const bills = db.prepare("SELECT * FROM bills WHERE flat_id = ? ORDER BY id DESC").all(req.params.flatId);
    const alerts = db.prepare("SELECT * FROM alerts WHERE tower = ? OR tower = 'All' ORDER BY created_at DESC").all(req.params.flatId.split('-')[0]);
    const visitors = db.prepare("SELECT * FROM visitors WHERE flat_id = ? ORDER BY entry_time DESC").all(req.params.flatId);
    
    res.json({ flat, bills, alerts, visitors });
  });

  app.post("/api/resident/complaints", (req, res) => {
    const { flatId, title, description } = req.body;
    db.prepare("INSERT INTO complaints (flat_id, title, description) VALUES (?, ?, ?)").run(flatId, title, description);
    res.json({ success: true });
  });

  app.get("/api/resident/complaints/:flatId", (req, res) => {
    const complaints = db.prepare("SELECT * FROM complaints WHERE flat_id = ? ORDER BY created_at DESC").all(req.params.flatId);
    res.json(complaints);
  });

  app.get("/api/amenities/bookings", (req, res) => {
    const bookings = db.prepare("SELECT * FROM bookings").all();
    res.json(bookings);
  });

  app.post("/api/amenities/book", (req, res) => {
    const { flatId, amenity, date, timeSlot } = req.body;
    const existing = db.prepare("SELECT * FROM bookings WHERE amenity = ? AND date = ? AND time_slot = ?").get(amenity, date, timeSlot);
    if (existing) {
      return res.status(400).json({ success: false, message: "Slot already booked" });
    }
    db.prepare("INSERT INTO bookings (flat_id, amenity, date, time_slot) VALUES (?, ?, ?, ?)").run(flatId, amenity, date, timeSlot);
    res.json({ success: true });
  });

  // Security Routes
  app.get("/api/security/visitors", (req, res) => {
    const visitors = db.prepare("SELECT * FROM visitors ORDER BY entry_time DESC").all();
    res.json(visitors);
  });

  app.post("/api/security/visitor-entry", (req, res) => {
    const { name, tower, flatId } = req.body;
    db.prepare("INSERT INTO visitors (name, tower, flat_id) VALUES (?, ?, ?)").run(name, tower, flatId);
    res.json({ success: true });
  });

  app.post("/api/security/visitor-exit", (req, res) => {
    const { id } = req.body;
    db.prepare("UPDATE visitors SET exit_time = CURRENT_TIMESTAMP, status = 'Out' WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Events
  app.get("/api/events", (req, res) => {
    const events = db.prepare("SELECT * FROM events ORDER BY date ASC").all();
    res.json(events);
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
