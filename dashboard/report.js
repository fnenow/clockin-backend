let allEntries = [];
let reportData = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchReportEntries();
  document.getElementById("applyFilters").addEventListener("click", applyFilters);
  document.getElementById("clearFilters").addEventListener("click", clearFilters);
  document.getElementById("exportCSV").addEventListener("click", exportToCSV);
});

async function fetchReportEntries() {
  try {
    const res = await fetch("/api/clock-entries/report");
    if (!res.ok) throw new Error("Failed to fetch report data");
    reportData = await res.json();
    allEntries = [...reportData];
    renderTable(allEntries);
    populateDropdowns(allEntries);
  } catch (err) {
    console.error("Error:", err);
  }
}

function renderTable(entries) {
  const tbody = document.querySelector("#reportTable");
  tbody.innerHTML = "";

  for (const row of entries) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.worker_name}</td>
      <td>${row.phone_last5}</td>
      <td>${row.date || ""}</td>
      <td>${row.project_name || ""}</td>
      <td>${row.clock_in || ""}</td>
      <td>${row.clock_out || ""}</td>
      <td>${row.hours || 0}</td>
      <td>${row.pay_rate || 0}</td>
      <td>${row.pay_amount || 0}</td>
      <td class="action-buttons">
        ${!row.clock_in ? `<button onclick="addTime('${row.phone_number}', '${row.worker_name}', '${row.project_name}', '${row.date}', 'Clock in')">Add In</button>` : ""}
        ${!row.clock_out ? `<button onclick="addTime('${row.phone_number}', '${row.worker_name}', '${row.project_name}', '${row.date}', 'Clock out')">Add Out</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function populateDropdowns(entries) {
  const workerSet = new Set();
  const projectSet = new Set();

  entries.forEach(e => {
    if (e.worker_name) workerSet.add(e.worker_name);
    if (e.project_name) projectSet.add(e.project_name);
  });

  const workerFilter = document.getElementById("workerFilter");
  const projectFilter = document.getElementById("projectFilter");
  workerFilter.innerHTML = '<option value="">All</option>';
  projectFilter.innerHTML = '<option value="">All</option>';

  [...workerSet].sort().forEach(name => {
    workerFilter.innerHTML += `<option value="${name}">${name}</option>`;
  });

  [...projectSet].sort().forEach(name => {
    projectFilter.innerHTML += `<option value="${name}">${name}</option>`;
  });
}

function applyFilters() {
  const from = document.getElementById("startDate").value;
  const to = document.getElementById("endDate").value;
  const worker = document.getElementById("workerFilter").value.toLowerCase();
  const project = document.getElementById("projectFilter").value.toLowerCase();

  let filtered = allEntries.filter(row => {
    const rowDate = row.date;
    return (
      (!from || rowDate >= from) &&
      (!to || rowDate <= to) &&
      (!worker || (row.worker_name || "").toLowerCase() === worker) &&
      (!project || (row.project_name || "").toLowerCase() === project)
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
    const cols = Array.from(tr.querySelectorAll("td")).slice(0, 9); // skip action column
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

async function addTime(phone_number, worker_name, project_name, date, action) {
  const time = prompt(`Enter ${action} time (HH:mm):`);
  if (!time) return;
  const datetime = `${date}T${time}`;

  const newEntry = {
    phone_number,
    worker_name,
    project_name,
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
    alert('✅ Time added successfully!');
    fetchReportEntries();
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}
