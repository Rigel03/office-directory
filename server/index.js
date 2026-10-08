const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { db } = require('./db');
const { authMiddleware } = require('./auth');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const groupRoutes = require('./routes/groups');
const trainingRoutes = require('./routes/training');
const importRoutes = require('./routes/import');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);

// General Audit logs endpoint
app.get('/api/audit-logs', authMiddleware, (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const logs = db.prepare(`
      SELECT a.*, e.full_name as employee_name
      FROM audit_logs a
      LEFT JOIN employees e ON a.employee_id = e.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(limit);

    const parsed = logs.map(l => ({
      ...l,
      changes: JSON.parse(l.changes || '[]')
    }));
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve audit log.' });
  }
});

// Serve static frontend in production if built
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for client-side routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send('API Server is running on port ' + PORT);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Office Directory API server running at http://localhost:${PORT}`);
});
