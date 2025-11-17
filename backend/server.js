const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static frontend files from the current folder
app.use(express.static(path.join(__dirname)));

// Initialize DB
db.init();

// API endpoints
app.get('/api/tenants', (req, res) => {
  try {
    const tenants = db.getAllTenants();
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

app.post('/api/tenants', (req, res) => {
  try {
    const tenant = req.body;
    if (!tenant.name) return res.status(400).json({ error: 'Name required' });
    const created = db.addTenant(tenant);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add tenant' });
  }
});

app.put('/api/tenants/:id/paid', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = db.markTenantPaid(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark paid' });
  }
});

app.delete('/api/tenants/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    db.deleteTenant(id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

app.listen(PORT, () => {
  console.log(`Rentify backend running at http://localhost:${PORT}`);
});
