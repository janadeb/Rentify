const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'rentify.db');
const db = new Database(dbPath);

function init() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      room TEXT,
      rent REAL,
      dueDate TEXT,
      status TEXT DEFAULT 'Unpaid'
    )
  `).run();
}

function getAllTenants() {
  return db.prepare('SELECT * FROM tenants ORDER BY id DESC').all();
}

function addTenant(tenant) {
  const stmt = db.prepare('INSERT INTO tenants (name, room, rent, dueDate, status) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(tenant.name, tenant.room, tenant.rent, tenant.dueDate, tenant.status || 'Unpaid');
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(info.lastInsertRowid);
}

function deleteTenant(id) {
  return db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
}

function markTenantPaid(id) {
  db.prepare('UPDATE tenants SET status = ? WHERE id = ?').run('Paid', id);
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
}

module.exports = { init, getAllTenants, addTenant, deleteTenant, markTenantPaid };
