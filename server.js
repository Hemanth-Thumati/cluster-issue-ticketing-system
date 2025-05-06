
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

// MySQL DB Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // change to your MySQL password
  database: 'ticketing_system'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to MySQL');
});

// 🗂️ Routes

// Register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  db.query(sql, [name, email, hashed], (err) => {
    if (err) return res.status(500).send('Error registering');
    res.redirect('/login.html');
  });
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).send('Invalid credentials');

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).send('Invalid credentials');

    req.session.userId = user.id;
    res.redirect('/create-ticket.html');
  });
});

// Create Ticket
app.post('/tickets', (req, res) => {
  const { cluster, issue, priority } = req.body;
  const userId = req.session.userId;

  if (!userId) return res.status(401).send('Unauthorized');

  const sql = 'INSERT INTO tickets (user_id, cluster, issue, priority, status) VALUES (?, ?, ?, ?, "Open")';
  db.query(sql, [userId, cluster, issue, priority], (err) => {
    if (err) return res.status(500).send('Error creating ticket');
    res.redirect('/view-tickets.html');
  });
});

// List Tickets
app.get('/tickets', (req, res) => {
  const sql = 'SELECT t.*, u.name FROM tickets t JOIN users u ON t.user_id = u.id ORDER BY t.id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Error fetching tickets');
    res.json(results);
  });
});

// Update Ticket Status (for admin — basic implementation)
app.post('/tickets/:id/status', (req, res) => {
  const { status } = req.body;
  const ticketId = req.params.id;

  const sql = 'UPDATE tickets SET status = ? WHERE id = ?';
  db.query(sql, [status, ticketId], (err) => {
    if (err) return res.status(500).send('Error updating status');
    res.send('Status updated');
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
