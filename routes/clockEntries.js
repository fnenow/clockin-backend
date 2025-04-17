<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>FNEClock Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { text-align: center; }
    .filters { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px; border: 1px solid #ccc; text-align: left; }
    th { background-color: #f4f4f4; cursor: pointer; }
    input[type="text"], select, input[type="datetime-local"] {
      padding: 5px; width: 100%;
    }
    button { padding: 6px 12px; cursor: pointer; }
    .actions { display: flex; gap: 10px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>📋 FNEClock Raw Dashboard</h1>

  <div class="actions">
    <button onclick="addNewRow()">➕ Add New</button>
  </div>

  <div class="filters">
    <label>From: <input type="date" id="startDate" /></label>
    <label>To: <input type="date" id="endDate" /></label>
    <label>Worker:
      <select id="workerFilter"><option value="">All</option></select>
    </label>
    <label>Project:
      <select id="projectFilter"><option value="">All</option></select>
    </label>
    <button onclick="applyFilters()">Filter</button>
    <button onclick="clearFilters()">Clear</button>
  </div>

  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Phone</th>
        <th>Worker</th>
        <th>Project</th>
        <th>Action</th>
        <th>DateTime</th>
        <th>Save</th>
        <th>Delete</th>
      </tr>
    </thead>
    <tbody id="entryTable"></tbody>
  </table>

  <script>
    let allEntries = [];

    async function fetchEntries() {
      const res = await fetch('/api/clock-entries');
      const data = await res.json();
      allEntries = data.sort((a, b) => new Date(a.datetime_pst) - new Date(b.datetime_pst));
      populateDropdowns(allEntries);
      renderTable(allEntries);
    }

    function populateDropdowns(entries) {
      const workerSet = new Set();
      const projectSet = new Set();

      entries.forEach(entry => {
        if (entry.worker_name) workerSet.add(entry.worker_name.toLowerCase());
        if (entry.project_name) projectSet.add(entry.project_name.toLowerCase());
      });

      const workerFilter = document.getElementById('workerFilter');
      const projectFilter = document.getElementById('projectFilter');

      workerFilter.innerHTML = '<option value="">All</option>';
      [...workerSet].sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        workerFilter.appendChild(opt);
      });

      projectFilter.innerHTML = '<option value="">All</option>';
      [...projectSet].sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        projectFilter.appendChild(opt);
      });
    }

    function applyFilters() {
      const worker = document.getElementById('workerFilter').value.toLowerCase();
      const project = document.getElementById('projectFilter').value.toLowerCase();
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;

      const filtered = allEntries.filter(entry => {
        const entryDate = new Date(entry.datetime_pst);
        const matchWorker = !worker || (entry.worker_name || '').toLowerCase() === worker;
        const matchProject = !project || (entry.project_name || '').toLowerCase() === project;
        const matchStart = !startDate || new Date(startDate) <= entryDate;
        const matchEnd = !endDate || entryDate <= new Date(endDate);
        return matchWorker && matchProject && matchStart && matchEnd;
      });

      renderTable(filtered);
    }

    function clearFilters() {
      document.getElementById('startDate').value = '';
      document.getElementById('endDate').value = '';
      document.getElementById('workerFilter').value = '';
      document.getElementById('projectFilter').value = '';
      renderTable(allEntries);
    }

    function renderTable(entries) {
      const tbody = document.getElementById('entryTable');
      tbody.innerHTML = '';

      entries.forEach(entry => {
        const row = document.createElement('tr');
        const dateLocal = new Date(entry.datetime_pst);
        const datetimeLocal = dateLocal.toLocaleString();
        const datetimeInput = dateLocal.toISOString().slice(0, 16);

        row.innerHTML = `
          <td>${entry.id}</td>
          <td><input type="text" value="${entry.phone_number}" /></td>
          <td><input type="text" value="${entry.worker_name}" /></td>
          <td><input type="text" value="${entry.project_name}" /></td>
          <td>
            <select>
              <option value="Clock in" ${entry.action === 'Clock in' ? 'selected' : ''}>Clock in</option>
              <option value="Clock out" ${entry.action === 'Clock out' ? 'selected' : ''}>Clock out</option>
            </select>
          </td>
          <td>
            <input type="datetime-local" value="${datetimeInput}" />
            <div style="font-size: 0.8em; color: gray">${datetimeLocal}</div>
          </td>
          <td><button onclick="saveRow(${entry.id}, this)">Save</button></td>
          <td><button onclick="deleteRow(${entry.id})">🗑️</button></td>
        `;
        tbody.appendChild(row);
      });
    }

    async function saveRow(id, btn) {
      const row = btn.closest('tr');
      const [phone, worker, project, action, datetime] = row.querySelectorAll('input, select');

      const payload = {
        phone_number: phone.value,
        worker_name: worker.value,
        project_name: project.value,
        action: action.value,
        datetime: datetime.value
      };

      try {
        const res = await fetch(`/api/clock-entries/${id}/update-all`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed');
        alert('✅ Updated!');
        fetchEntries();
      } catch (err) {
        alert('❌ Update failed');
        console.error(err);
      }
    }

    async function deleteRow(id) {
      if (!confirm('Delete this entry?')) return;

      try {
        const res = await fetch(`/api/clock-entries/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        alert('🗑️ Deleted');
        fetchEntries();
      } catch (err) {
        alert('❌ Delete failed');
        console.error(err);
      }
    }

    async function addNewRow() {
      const now = new Date();
      const datetime = now.toISOString().slice(0, 16);

      const payload = {
        phone_number: '',
        worker_name: '',
        project_name: '',
        action: 'Clock in',
        datetime
      };

      try {
        const res = await fetch('/api/clock-entries/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Add failed');
        alert('✅ Added!');
        fetchEntries();
      } catch (err) {
        alert('❌ Failed to add');
        console.error(err);
      }
    }

    fetchEntries();
  </script>
</body>
</html>
