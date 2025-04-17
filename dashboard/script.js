let allEntries = [];

async function fetchEntries() {
  const res = await fetch('/api/clock-entries');
  allEntries = await res.json();
  applyFilters();
}

function applyFilters() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const worker = document.getElementById('workerFilter').value.toLowerCase();
  const project = document.getElementById('projectFilter').value.toLowerCase();
  const sortBy = document.getElementById('sortBy').value;

  let filtered = [...allEntries];

  if (start) {
    const startDate = new Date(start);
    filtered = filtered.filter(e => new Date(e.datetime_pst) >= startDate);
  }

  if (end) {
    const endDate = new Date(end);
    filtered = filtered.filter(e => new Date(e.datetime_pst) <= endDate);
  }

  if (worker) {
    filtered = filtered.filter(e => (e.worker_name || '').toLowerCase().includes(worker));
  }

  if (project) {
    filtered = filtered.filter(e => (e.project_name || '').toLowerCase().includes(project));
  }

  filtered.sort((a, b) => {
    const aVal = (a[sortBy] || '').toString().toLowerCase();
    const bVal = (b[sortBy] || '').toString().toLowerCase();
    return aVal.localeCompare(bVal);
  });

  displayEntries(filtered);
}

function clearFilters() {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('workerFilter').value = '';
  document.getElementById('projectFilter').value = '';
  applyFilters();
}

function displayEntries(entries) {
  const table = document.querySelector('#entriesTable tbody');
  table.innerHTML = '';

  for (let entry of entries) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.id}</td>
      <td><input class="editable" type="text" value="${entry.phone_number || ''}" data-field="phone_number"></td>
      <td><input class="editable" type="text" value="${entry.worker_name || ''}" data-field="worker_name"></td>
      <td><input class="editable" type="text" value="${entry.project_name || ''}" data-field="project_name"></td>
      <td><input class="editable" type="text" value="${entry.action || ''}" data-field="action"></td>
      <td><input class="editable" type="datetime-local" value="${formatToDatetimeLocal(entry.datetime_pst)}" data-field="datetime_pst"></td>
      <td><button onclick="saveEntry(${entry.id}, this)">💾 Save</button></td>
    `;

    // Store the entry data on the row
    row.dataset.entryId = entry.id;
    table.appendChild(row);
  }
}

function formatToDatetimeLocal(pstDateTime) {
  const date = new Date(pstDateTime);
  if (isNaN(date.getTime())) return '';
  const iso = date.toISOString();
  return iso.substring(0, 16); // yyyy-MM-ddTHH:mm
}

async function saveEntry(id, buttonEl) {
  const row = buttonEl.closest('tr');
  const inputs = row.querySelectorAll('.editable');

  const updatedData = {};
  inputs.forEach(input => {
    const field = input.dataset.field;
    updatedData[field] = input.value;
  });

  try {
    const res = await fetch(`/api/clock-entries/${id}/update-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    if (!res.ok) throw new Error('Failed to update');

    alert('✅ Entry updated!');
    fetchEntries();
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

fetchEntries();
