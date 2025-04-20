let allEntries = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchReportEntries();
  document.getElementById("applyFilters").addEventListener("click", applyFilters);
  document.getElementById("clearFilters").addEventListener("click", clearFilters);
  document.getElementById("exportCSV").addEventListener("click", exportToCSV);
});

function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}



function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }); // e.g., "Apr 18, 2025"
}


async function fetchReportEntries() {
  try {
    const res = await fetch("/api/clock-entries/report");
    if (!res.ok) throw new Error("Failed to fetch report data");
    allEntries = await res.json();
    renderTable(allEntries);
    populateDropdowns(allEntries);
  } catch (err) {
    console.error("Error:", err);
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function populateDropdowns(entries) {
  const workerMap = new Map();
  const projectMap = new Map();

  entries.forEach(e => {
    if (e.worker_name) {
      const key = e.worker_name.toLowerCase();
      if (!workerMap.has(key)) workerMap.set(key, capitalize(e.worker_name));
    }
    if (e.project_name) {
      const key = e.project_name.toLowerCase();
      if (!projectMap.has(key)) projectMap.set(key, capitalize(e.project_name));
    }
  });

  const workerFilter = document.getElementById("workerFilter");
  const projectFilter = document.getElementById("projectFilter");
  workerFilter.innerHTML = '<option value="">All</option>';
  projectFilter.innerHTML = '<option value="">All</option>';

  [...workerMap.entries()].sort().forEach(([key, value]) => {
    workerFilter.innerHTML += `<option value="${key}">${value}</option>`;
  });

  [...projectMap.entries()].sort().forEach(([key, value]) => {
    projectFilter.innerHTML += `<option value="${key}">${value}</option>`;
  });
}

function renderTable(entries) {
  const tbody = document.querySelector("#reportTable");
  tbody.innerHTML = "";

  for (const row of entries) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.worker_name}</td>
      <td>${row.phone_last5}</td>
      <td>${formatDate(row.date)}</td>
      <td>${row.project_name || ""}</td>
      <td>${formatTime(row.clock_in)}</td>
      <td>${formatTime(row.clock_out)}</td>
      <td>${row.hours || 0}</td>
      <td>${row.pay_rate || 0}</td>
      <td>${row.pay_amount || 0}</td>
      <td class="action-buttons">
        ${!row.clock_in ? `<button onclick="addTime('${row.id}', 'Clock in')">Add In</button>` : ""}
        ${!row.clock_out ? `<button onclick="addTime('${row.id}', 'Clock out')">Add Out</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function applyFilters() {
  const from = document.getElementById("startDate").value;
  const to = document.getElementById("endDate").value;
  const worker = document.getElementById("workerFilter").value.toLowerCase();
  const project = document.getElementById("projectFilter").value.toLowerCase();

  const filtered = allEntries.filter(row => {
    const rowDate = row.date;
    const rowWorker = (row.worker_name || "").toLowerCase();
    const rowProject = (row.project_name || "").toLowerCase();
    return (
      (!from || rowDate >= from) &&
      (!to || rowDate <= to) &&
      (!worker || rowWorker === worker) &&
      (!project || rowProject === project)
    );
  });

  renderTable(filtered);
}

function clearFilters() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("workerFilter").value = "";
  document.getElementById("projectFilter").value = "";
  renderTable(allEntries);
}

function exportToCSV() {
  const rows = [["Worker", "Phone", "Date", "Project", "Clock In", "Clock Out", "Hours", "Rate", "Amount"]];
  document.querySelectorAll("#reportTable tbody tr").forEach(tr => {
    const cols = Array.from(tr.querySelectorAll("td")).slice(0, 9);
    const row = cols.map(td => `"${td.textContent}"`).join(",");
    rows.push(row);
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "report.csv";
  a.click();
}

async function addTime(entryId, action) {
  const datetime = prompt(`Enter ${action} time (YYYY-MM-DDTHH:mm):`);
  if (!datetime) return;

  // Find entry by phone/project/date combo
  const entry = allEntries.find(e => e.id === Number(entryId));
  if (!entry) return alert("Entry not found.");

  const newEntry = {
    phone_number: entry.phone_number,
    worker_name: entry.worker_name,
    project_name: entry.project_name,
    action,
    datetime,
    note: `[Added ${action}]`
  };

  try {
    const res = await fetch('/api/clock-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });

    if (!res.ok) throw new Error('Failed to add time');
    alert('Time added successfully!');
    fetchReportEntries(); // refresh table
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

