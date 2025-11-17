// Navigation
function showSection(sectionId) {
  document.querySelectorAll("main section").forEach(section => section.classList.remove("active"));
  document.getElementById(sectionId).classList.add("active");
  // highlight active nav button
  document.querySelectorAll('nav button').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', onclickAttr.includes(`'${sectionId}'`));
  });
}

// Tenant Management
let tenants = [];
let apiAvailable = false;
// pending delete index for modal confirmation
let pendingDeleteIndex = null;

// Persist tenants to localStorage so data remains after exiting the app
function saveTenants() {
  try {
    // Always keep a local copy as a fallback
    localStorage.setItem('rentifyTenants', JSON.stringify(tenants));
  } catch (err) {
    console.warn('Failed to save tenants to localStorage', err);
  }
}

function loadTenants() {
  // First try the API; if it fails, fall back to localStorage
  return fetch('/api/tenants').then(res => {
    if (!res.ok) throw new Error('API not available');
    return res.json();
  }).then(data => {
    apiAvailable = true;
    tenants = data;
  }).catch(() => {
    apiAvailable = false;
    try {
      const raw = localStorage.getItem('rentifyTenants');
      if (raw) tenants = JSON.parse(raw);
    } catch (err) {
      console.warn('Failed to load tenants from localStorage', err);
    }
  });
}

const tenantForm = document.getElementById("tenantForm");
tenantForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("tenantName").value;
  const room = document.getElementById("tenantRoom").value;
  const rent = document.getElementById("tenantRent").value;
  const dueDate = document.getElementById("tenantDueDate").value;
  const tenant = { name, room, rent, dueDate, status: "Unpaid" };
  // If API is available, POST to server and use returned record (with id)
  if (apiAvailable) {
    fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant)
    }).then(r => r.json()).then(created => {
      tenants.push(created);
      updateTenantTable();
      updatePaymentTable();
      updateDashboard();
      saveTenants();
      tenantForm.reset();
    }).catch(err => {
      console.error('Failed to add tenant to API', err);
      // fallback to local behavior
      tenants.push(tenant);
      updateTenantTable();
      updatePaymentTable();
      updateDashboard();
      saveTenants();
      tenantForm.reset();
    });
  } else {
    tenants.push(tenant);
    updateTenantTable();
    updatePaymentTable();
    updateDashboard();
    saveTenants();
    tenantForm.reset();
  }
});

function updateTenantTable() {
  const tbody = document.querySelector("#tenantTable tbody");
  tbody.innerHTML = "";
  tenants.forEach((tenant, index) => {
    const row = document.createElement("tr");
    const statusClass = tenant.status === "Paid" ? "status-paid" : "status-unpaid";
    row.innerHTML = `
      <td>${tenant.name}</td>
      <td>${tenant.room}</td>
      <td>${tenant.rent}</td>
      <td>${tenant.dueDate}</td>
      <td class="${statusClass}">${tenant.status}</td>
      <td>
        <button class="actionBtn" onclick="deleteTenant(${index})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function deleteTenant(index) {
  // open custom modal and store pending index
  const tenant = tenants[index];
  pendingDeleteIndex = index;
  const msgEl = document.getElementById('deleteModalMessage');
  if (msgEl) msgEl.innerText = `Delete tenant "${tenant.name}" (Room: ${tenant.room})? This action cannot be undone.`;
  const modal = document.getElementById('deleteModal');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function confirmDelete() {
  if (pendingDeleteIndex === null) return closeDeleteModal();
  const tenant = tenants[pendingDeleteIndex];
  const id = tenant && tenant.id;
  // If tenant has an id and API is available, delete on server first
  if (apiAvailable && id) {
    fetch(`/api/tenants/${id}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) throw new Error('Failed to delete on server');
      tenants.splice(pendingDeleteIndex, 1);
      pendingDeleteIndex = null;
      updateTenantTable();
      updatePaymentTable();
      updateDashboard();
      saveTenants();
      closeDeleteModal();
    }).catch(err => {
      console.error('Server delete failed, falling back to local delete', err);
      tenants.splice(pendingDeleteIndex, 1);
      pendingDeleteIndex = null;
      updateTenantTable();
      updatePaymentTable();
      updateDashboard();
      saveTenants();
      closeDeleteModal();
    });
  } else {
    tenants.splice(pendingDeleteIndex, 1);
    pendingDeleteIndex = null;
    updateTenantTable();
    updatePaymentTable();
    updateDashboard();
    saveTenants();
    closeDeleteModal();
  }
}

function cancelDelete() {
  pendingDeleteIndex = null;
  closeDeleteModal();
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

// Payment Tracking
function updatePaymentTable() {
  const tbody = document.querySelector("#paymentTable tbody");
  tbody.innerHTML = "";
  tenants.forEach((tenant, index) => {
    const row = document.createElement("tr");
    // Status coloring
    const statusClass = tenant.status === "Paid" ? "status-paid" : "status-unpaid";
    // Button logic
    let buttonHtml = "";
    if (tenant.status === "Paid") {
      buttonHtml = `<button class="actionBtn paid" disabled>PAID</button>`;
    } else {
      buttonHtml = `<button class="actionBtn" onclick="markPaid(${index})">Mark Paid</button>`;
    }
    row.innerHTML = `
      <td>${tenant.name}</td>
      <td>${tenant.room}</td>
      <td>${tenant.rent}</td>
      <td>${tenant.dueDate}</td>
      <td class="${statusClass}">${tenant.status}</td>
      <td>${buttonHtml}</td>
    `;
    tbody.appendChild(row);
  });
}

function markPaid(index) {
  const tenant = tenants[index];
  if (!tenant) return;
  // If tenant exists on server, send update
  if (apiAvailable && tenant.id) {
    fetch(`/api/tenants/${tenant.id}/paid`, { method: 'PUT' }).then(res => {
      if (!res.ok) throw new Error('Failed to mark paid on server');
      tenant.status = 'Paid';
      updateTenantTable();
      updatePaymentTable();
      updateDashboard();
      saveTenants();
    }).catch(err => {
      console.error('Failed to mark paid on server, updating locally', err);
      tenant.status = 'Paid';
      updateTenantTable();
      updatePaymentTable();
      updateDashboard();
      saveTenants();
    });
  } else {
    tenant.status = 'Paid';
    updateTenantTable();
    updatePaymentTable();
    updateDashboard();
    saveTenants();
  }
}


// Dashboard Stats
function updateDashboard() {
  const totalEl = document.getElementById("totalTenants");
  const paidEl = document.getElementById("paidTenants");
  const pastDueEl = document.getElementById("pastDueCount");
  const total = tenants.length;
  const paidCount = tenants.filter(t => t.status === "Paid").length;
  // Count past due tenants (unpaid and due date has passed)
  const today = new Date().toISOString().split('T')[0];
  const pastDueCount = tenants.filter(t => t.status === "Unpaid" && t.dueDate < today).length;

  if (totalEl) {
    totalEl.innerText = total;
    // add red class when zero, remove when > 0
    totalEl.classList.toggle('metric-zero', total === 0);
  }

  if (paidEl) {
    paidEl.innerText = paidCount;
    paidEl.classList.toggle('metric-zero', paidCount === 0);
    paidEl.classList.toggle('metric-critical', paidCount === 0);
  }

  if (pastDueEl) {
    pastDueEl.innerText = pastDueCount;
    pastDueEl.classList.toggle('metric-zero', pastDueCount === 0);
    // When past due exceed 10, make it critical red with larger font
    pastDueEl.classList.toggle('metric-critical', pastDueCount > 10);
  }
}

// Initialize dashboard counts and active nav on load
document.addEventListener('DOMContentLoaded', () => {
  // load saved tenants first (try API, then fallback)
  loadTenants().then(() => {
    // render tables from loaded data
    updateTenantTable();
    updatePaymentTable();
    updateDashboard();
  });
  const activeSection = document.querySelector('main section.active')?.id || 'dashboard';
  document.querySelectorAll('nav button').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', onclickAttr.includes(`'${activeSection}'`));
  });
  // Style Add Tenant button as red actionBtn
  const addTenantBtn = document.querySelector('#tenantForm button[type="submit"]');
  if (addTenantBtn) addTenantBtn.classList.add('actionBtn');

  // Dark mode toggle
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    // Load saved preference from localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      darkModeToggle.textContent = '☀️';
    }

    // Toggle dark mode on button click
    darkModeToggle.addEventListener('click', () => {
      const isCurrentlyDark = document.body.classList.toggle('dark-mode');
      darkModeToggle.textContent = isCurrentlyDark ? '☀️' : '🌙';
      localStorage.setItem('darkMode', isCurrentlyDark);
    });
  }
});
