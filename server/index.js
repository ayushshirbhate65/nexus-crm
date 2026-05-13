require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { authenticate, adminOnly } = require('./middleware');
const googleSheets = require('./googleSheets');
const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_crm_secret_key_2024';

app.use(express.json());
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173', credentials: true }));

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '../dist')));

// ─────────────────────────────────────────
// DB connectivity flag + in-memory fallback
// ─────────────────────────────────────────
let dbConnected = false;

// Pre-hashed passwords:
// Admin@123 => $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
// Emp@123   => $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
const FALLBACK_USERS = [
  { id: 1, name: 'Admin User',   email: 'admin@crm.com',    role: 'admin',    password: '$2a$10$HBVgXXORXLgNokk/C0ytyO/tdP4saBA3tCJbfaEqmsSYOhWt4Ceue', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin' },
  { id: 2, name: 'John Employee','email': 'employee@crm.com', role: 'employee', password: '$2a$10$V7PXDxXvxmWwnqbSI1yZO.tui4sgsG9SOJ/A0As.tqgvAlbR3VLLq', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
];

async function queryDB(sql, params = []) {
  if (!dbConnected) throw new Error('DB_NOT_CONNECTED');
  return pool.query(sql, params);
}

// ─────────────────────────────────────────
// Helper: insert activity log
// ─────────────────────────────────────────
async function logActivity(userId, userName, action, details, entityType = null, entityId = null) {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, entity_type, entity_id) VALUES (?,?,?,?,?,?)',
      [userId, userName, action, details, entityType, entityId]
    );
  } catch (err) {
    console.error('Log error:', err.message);
  }
}

// ─────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    let user;

    console.log(`[Auth] Login attempt for: ${email} (DB Connected: ${dbConnected})`);

    if (dbConnected) {
      // Use MySQL
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length === 0) {
        console.log(`[Auth] User not found in DB: ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      user = rows[0];
    } else {
      // Fallback: in-memory users
      console.log(`[Auth] MySQL unavailable - using in-memory fallback for ${email}`);
      user = FALLBACK_USERS.find(u => u.email === email);
      if (!user) {
        console.log(`[Auth] User not found in fallback: ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    console.log(`[Auth] User found: ${user.name}, verifying password...`);
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`[Auth] Password mismatch for ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[Auth] Login successful for ${email}`);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log only if DB is available
    if (dbConnected) {
      await logActivity(user.id, user.name, 'Login', 'User logged in from web', 'auth');
    }

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (err) {
    console.error('[Login Error]', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/auth/register (Public - creates an admin)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;

    if (dbConnected) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role, avatar) VALUES (?,?,?,?,?)',
        [name, email, hashedPassword, 'admin', avatar]
      );
      await logActivity(result.insertId, name, 'Registration', 'User registered as Admin', 'auth');
    } else {
      // Logic for fallback mode: just pretend it worked
      FALLBACK_USERS.push({ id: Date.now(), name, email, password: hashedPassword, role: 'admin', avatar });
    }

    res.json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// GET /api/auth/me  (verify token)
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ─────────────────────────────────────────
// CUSTOMER ROUTES
// ─────────────────────────────────────────

// GET /api/customers — both roles, but employees only see their own
const MOCK_CUSTOMERS = [
  { id: 1, customer_code: 'CUST-001', name: 'Alice Johnson',  contact_number: '+1 234-567-8901', service_type: 'Technical Support', call_status: 'responded',     response_notes: 'Resolved issue with login.',                           service_done: 1, forward_to_senior: 0, assigned_employee_id: 2, assigned_employee_name: 'John Employee', date_time: '2024-10-24T10:30:00Z', created_at: '2024-10-24T10:30:00Z' },
  { id: 2, customer_code: 'CUST-002', name: 'Bob Smith',      contact_number: '+1 234-567-8902', service_type: 'Billing Inquiry',   call_status: 'pending',        response_notes: '',                                                     service_done: 0, forward_to_senior: 0, assigned_employee_id: 2, assigned_employee_name: 'John Employee', date_time: '2024-10-24T11:15:00Z', created_at: '2024-10-24T11:15:00Z' },
  { id: 3, customer_code: 'CUST-003', name: 'Charlie Brown',  contact_number: '+1 234-567-8903', service_type: 'Product Demo',      call_status: 'forwarded',      response_notes: 'Customer needs complex enterprise integration details.', service_done: 0, forward_to_senior: 1, assigned_employee_id: 2, assigned_employee_name: 'John Employee', date_time: '2024-10-24T09:00:00Z', created_at: '2024-10-24T09:00:00Z' },
  { id: 4, customer_code: 'CUST-004', name: 'Diana Prince',   contact_number: '+1 234-567-8904', service_type: 'Warranty Claim',    call_status: 'not_responded',  response_notes: 'Tried calling 3 times, no answer.',                    service_done: 0, forward_to_senior: 0, assigned_employee_id: 2, assigned_employee_name: 'John Employee', date_time: '2024-10-23T14:20:00Z', created_at: '2024-10-23T14:20:00Z' },
  { id: 5, customer_code: 'CUST-005', name: 'Ethan Hunt',     contact_number: '+1 234-567-8905', service_type: 'General Inquiry',   call_status: 'responded',      response_notes: 'Information provided about new features.',              service_done: 1, forward_to_senior: 0, assigned_employee_id: 2, assigned_employee_name: 'John Employee', date_time: '2024-10-23T16:45:00Z', created_at: '2024-10-23T16:45:00Z' },
];

app.get('/api/customers', authenticate, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // FALLBACK when MySQL is not connected
    if (!dbConnected) {
      let result = [...MOCK_CUSTOMERS];
      if (req.user.role === 'employee') result = result.filter(c => c.assigned_employee_id === req.user.id);
      if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.customer_code.includes(search));
      if (status && status !== 'all') result = result.filter(c => c.call_status === status);
      const total = result.length;
      const paginated = result.slice(offset, offset + parseInt(limit));
      return res.json({ customers: paginated, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    }

    let query = `
      SELECT c.*, u.name AS assigned_employee_name, u.email AS assigned_employee_email
      FROM customers c
      LEFT JOIN users u ON c.assigned_employee_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Employees only see their own assigned customers
    if (req.user.role === 'employee') {
      query += ' AND c.assigned_employee_id = ?';
      params.push(req.user.id);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.customer_code LIKE ? OR c.contact_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status && status !== 'all') {
      query += ' AND c.call_status = ?';
      params.push(status);
    }

    const countQuery = query.replace(/SELECT c\.\*, u\.name AS.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);
    res.json({ customers: rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers — admin only
app.post('/api/customers', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, contact_number, service_type, call_status, response_notes, service_done, forward_to_senior, assigned_employee_id, follow_up_date } = req.body;
    const code = 'CUST-' + Date.now().toString().slice(-6);

    const [result] = await pool.query(
      `INSERT INTO customers (customer_code, name, contact_number, service_type, call_status, response_notes, service_done, forward_to_senior, assigned_employee_id, follow_up_date)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [code, name, contact_number, service_type, call_status || 'pending', response_notes || '', service_done || 0, forward_to_senior || 0, assigned_employee_id || null, follow_up_date || null]
    );

    await logActivity(req.user.id, req.user.name, 'Customer Created', `Created customer: ${name}`, 'customer', result.insertId);
    
    const [newRows] = await pool.query('SELECT c.*, u.name as assigned_employee_name FROM customers c LEFT JOIN users u ON c.assigned_employee_id = u.id WHERE c.id = ?', [result.insertId]);
    const newCustomer = newRows[0];

    // Sync to Google Sheets (if configured)
    googleSheets.syncCustomer(newCustomer).catch(e => console.error('Sheet Sync Error:', e.message));

    res.status(201).json(newCustomer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/customers/:id — admin: all fields; employee: only call_status, response_notes, service_done
app.put('/api/customers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (req.user.role === 'employee') {
      // Employees can only update status, notes, and service_done
      const { call_status, response_notes, service_done } = body;
      await pool.query(
        'UPDATE customers SET call_status=?, response_notes=?, service_done=? WHERE id=? AND assigned_employee_id=?',
        [call_status, response_notes, service_done, id, req.user.id]
      );
    } else {
      // Admin can update everything
      const { name, contact_number, service_type, call_status, response_notes, service_done, forward_to_senior, assigned_employee_id, follow_up_date } = body;
      await pool.query(
        `UPDATE customers SET name=?, contact_number=?, service_type=?, call_status=?, response_notes=?,
         service_done=?, forward_to_senior=?, assigned_employee_id=?, follow_up_date=? WHERE id=?`,
        [name, contact_number, service_type, call_status, response_notes, service_done, forward_to_senior, assigned_employee_id, follow_up_date, id]
      );
    }

    await logActivity(req.user.id, req.user.name, 'Customer Updated', `Updated customer ID: ${id}`, 'customer', parseInt(id));
    
    const [updatedRows] = await pool.query('SELECT c.*, u.name as assigned_employee_name FROM customers c LEFT JOIN users u ON c.assigned_employee_id = u.id WHERE c.id = ?', [id]);
    const updatedCustomer = updatedRows[0];

    // Sync to Google Sheets (if configured)
    googleSheets.syncCustomer(updatedCustomer).catch(e => console.error('Sheet Sync Error:', e.message));

    res.json(updatedCustomer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers/bulk — bulk import
app.post('/api/customers/bulk', authenticate, adminOnly, async (req, res) => {
  try {
    const customers = req.body; // Array of customer objects
    if (!Array.isArray(customers)) return res.status(400).json({ error: 'Invalid data format' });

    let count = 0;
    for (const c of customers) {
      const code = 'CUST-' + (Date.now() + count).toString().slice(-6);
      await pool.query(
        `INSERT INTO customers (customer_code, name, contact_number, service_type, call_status, assigned_employee_id)
         VALUES (?,?,?,?,?,?)`,
        [code, c.name, c.contact_number || c.phone, c.service_type || 'Imported', 'pending', c.assigned_employee_id || null]
      );
      count++;
    }

    if (dbConnected) {
      await logActivity(req.user.id, req.user.name, 'Bulk Import', `Imported ${count} customers`, 'customer');
      // Optional: trigger full sync after bulk import
      const [all] = await pool.query('SELECT c.*, u.name as assigned_employee_name FROM customers c LEFT JOIN users u ON c.assigned_employee_id = u.id');
      googleSheets.fullSync(all).catch(e => console.log('Bulk sync error:', e.message));
    }

    res.json({ message: `Successfully imported ${count} customers` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// DELETE /api/customers/:id — admin only
app.delete('/api/customers/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT name FROM customers WHERE id=?', [id]);
    await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    await logActivity(req.user.id, req.user.name, 'Customer Deleted', `Deleted customer: ${rows[0]?.name}`, 'customer', parseInt(id));
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// USER MANAGEMENT ROUTES (admin only)
// ─────────────────────────────────────────

// GET all users
app.get('/api/users', authenticate, adminOnly, async (req, res) => {
  try {
    if (!dbConnected) return res.json(FALLBACK_USERS);
    const [rows] = await pool.query('SELECT id, name, email, role, avatar, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// CREATE new user (Admin adds employee/admin)
app.post('/api/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    if (dbConnected) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) return res.status(409).json({ error: 'Email already exists' });

      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role, avatar) VALUES (?,?,?,?,?)',
        [name, email, hashedPassword, role || 'employee', avatar]
      );
      await logActivity(req.user.id, req.user.name, 'User Created', `Created ${role || 'employee'} account: ${name}`, 'user', result.insertId);
      res.status(201).json({ id: result.insertId, name, email, role, avatar });
    } else {
      res.json({ message: 'Mock user created (DB not connected)' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE user
app.put('/api/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    if (dbConnected) {
      let sql = 'UPDATE users SET name=?, email=?, role=?';
      let params = [name, email, role];

      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        sql += ', password=?';
        params.push(hashed);
      }

      sql += ' WHERE id=?';
      params.push(id);

      await pool.query(sql, params);
      await logActivity(req.user.id, req.user.name, 'User Updated', `Updated user: ${name}`, 'user', parseInt(id));
      res.json({ message: 'User updated' });
    } else {
      res.json({ message: 'Mock update successful' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE user
app.delete('/api/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (dbConnected) {
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      await logActivity(req.user.id, req.user.name, 'User Deleted', `Deleted user ID: ${id}`, 'user', parseInt(id));
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id — admin only (can't delete self)
app.delete('/api/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    const [rows] = await pool.query('SELECT name FROM users WHERE id=?', [id]);
    await pool.query('DELETE FROM users WHERE id=?', [id]);
    await logActivity(req.user.id, req.user.name, 'User Deleted', `Deleted user: ${rows[0]?.name}`, 'user', parseInt(id));
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// ACTIVITY LOGS (admin: all logs; employee: own logs only)
// ─────────────────────────────────────────

app.get('/api/logs', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = 'SELECT * FROM activity_logs';
    const params = [];

    if (req.user.role === 'employee') {
      query += ' WHERE user_id = ?';
      params.push(req.user.id);
    }

    const [countRows] = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const total = countRows[0].total;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);
    res.json({ logs: rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────

app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  try {
    let baseWhere = req.user.role === 'employee' ? 'WHERE assigned_employee_id = ?' : 'WHERE 1=1';
    const params = req.user.role === 'employee' ? [req.user.id] : [];

    const [total]     = await pool.query(`SELECT COUNT(*) as c FROM customers ${baseWhere}`, params);
    const [responded] = await pool.query(`SELECT COUNT(*) as c FROM customers ${baseWhere} AND call_status='responded'`, params);
    const [missed]    = await pool.query(`SELECT COUNT(*) as c FROM customers ${baseWhere} AND call_status='not_responded'`, params);
    const [forwarded] = await pool.query(`SELECT COUNT(*) as c FROM customers ${baseWhere} AND forward_to_senior=1`, params);
    const [done]      = await pool.query(`SELECT COUNT(*) as c FROM customers ${baseWhere} AND service_done=1`, params);
    const [pending]   = await pool.query(`SELECT COUNT(*) as c FROM customers ${baseWhere} AND service_done=0`, params);

    res.json({
      total: total[0].c,
      responded: responded[0].c,
      missed: missed[0].c,
      forwarded: forwarded[0].c,
      completed: done[0].c,
      pending: pending[0].c
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// SETTINGS - update own profile
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// GOOGLE SHEETS SYNC
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// GOOGLE SHEETS SETTINGS & SYNC
// ─────────────────────────────────────────

async function loadGoogleConfig() {
  if (!dbConnected) return;
  try {
    const [rows] = await pool.query('SELECT * FROM system_settings WHERE setting_key LIKE "google_%"');
    const config = {};
    rows.forEach(r => {
      if (r.setting_key === 'google_sheet_id') config.spreadsheetId = r.setting_value;
      if (r.setting_key === 'google_client_email') config.clientEmail = r.setting_value;
      if (r.setting_key === 'google_private_key') config.privateKey = r.setting_value;
    });
    if (config.spreadsheetId) {
      googleSheets.updateConfig(config);
    }
  } catch (err) {
    console.error('Failed to load Google config:', err.message);
  }
}

app.get('/api/settings/google', authenticate, adminOnly, async (req, res) => {
  try {
    if (!dbConnected) return res.json({ spreadsheetId: '', clientEmail: '', privateKey: '' });
    const [rows] = await pool.query('SELECT * FROM system_settings WHERE setting_key LIKE "google_%"');
    const config = {};
    rows.forEach(r => {
      if (r.setting_key === 'google_sheet_id') config.spreadsheetId = r.setting_value;
      if (r.setting_key === 'google_client_email') config.clientEmail = r.setting_value;
      if (r.setting_key === 'google_private_key') config.privateKey = r.setting_value;
    });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings/google', authenticate, adminOnly, async (req, res) => {
  try {
    const { spreadsheetId, clientEmail, privateKey } = req.body;
    if (dbConnected) {
      await pool.query('INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['google_sheet_id', spreadsheetId, spreadsheetId]);
      await pool.query('INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['google_client_email', clientEmail, clientEmail]);
      await pool.query('INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['google_private_key', privateKey, privateKey]);
      await loadGoogleConfig();
    }
    res.json({ message: 'Google Sheets settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.post('/api/google-sheets/import', authenticate, adminOnly, async (req, res) => {
  try {
    let { spreadsheetId } = req.body;
    // Extract ID if URL is provided
    if (spreadsheetId.includes('/d/')) {
      spreadsheetId = spreadsheetId.split('/d/')[1].split('/')[0];
    }

    const rows = await googleSheets.getSheetData(spreadsheetId);
    if (rows.length <= 1) return res.status(400).json({ error: 'Sheet is empty or only has headers' });

    // headers: ['ID', 'Code', 'Name', 'Contact', 'Service', 'Status', 'Assigned To', 'Follow Up', 'Done', 'Last Updated']
    const data = rows.slice(1).map(row => ({
      name: row[2] || '',
      contact_number: row[3] || '',
      service_type: row[4] || 'Google Import',
      call_status: row[5] || 'pending',
    }));

    let count = 0;
    for (const c of data) {
      if (!c.name) continue;
      const code = 'G-' + (Date.now() + count).toString().slice(-6);
      await pool.query(
        `INSERT INTO customers (customer_code, name, contact_number, service_type, call_status)
         VALUES (?,?,?,?,?)`,
        [code, c.name, c.contact_number, c.service_type, c.call_status]
      );
      count++;
    }

    res.json({ message: `Successfully imported ${count} customers from Google Sheet` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

app.post('/api/google-sheets/sync', authenticate, adminOnly, async (req, res) => {
  try {
    let customers;
    if (dbConnected) {
      const [rows] = await pool.query(`
        SELECT c.*, u.name AS assigned_employee_name 
        FROM customers c 
        LEFT JOIN users u ON c.assigned_employee_id = u.id
      `);
      customers = rows;
    } else {
      console.log('[Sync] Using mock data for Google Sheets sync');
      customers = MOCK_CUSTOMERS;
    }
    
    await googleSheets.fullSync(customers);
    res.json({ message: 'Full sync to Google Sheets completed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed: ' + err.message });
  }
});

app.put('/api/settings/profile', authenticate, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
    const user = rows[0];

    if (newPassword) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET name=?, password=? WHERE id=?', [name, hashed, req.user.id]);
    } else {
      await pool.query('UPDATE users SET name=? WHERE id=?', [name, req.user.id]);
    }

    await logActivity(req.user.id, req.user.name, 'Profile Updated', 'User updated their profile', 'user', req.user.id);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────
// Catch-all route to serve the frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    const conn = await pool.getConnection();
    dbConnected = true;
    console.log('✅ MySQL connected to database:', process.env.DB_NAME);
    conn.release();
    await loadGoogleConfig();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.warn('⚠️  Running in FALLBACK MODE - login works with built-in demo accounts');
    console.warn('   To enable full MySQL mode, run: mysql -u root -p < setup_mysql_user.sql');
  }
  console.log(`🚀 Nexus CRM Server running on http://localhost:${PORT}`);
  if (!dbConnected) {
    console.log('📋 Demo accounts available:');
    console.log('   admin@crm.com   → Admin@123  (Admin role)');
    console.log('   employee@crm.com → Emp@123   (Employee role)');
  }
});

module.exports = app;
