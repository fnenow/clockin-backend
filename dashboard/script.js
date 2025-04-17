document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#entriesTable tbody");
  const filters = {
    start: document.getElementById("startDate"),
    end: document.getElementById("endDate"),
    worker: document.getElementById("workerFilter"),
    project: document.getElementById("projectFilter"),
    sort: document.getElementById("sortBy"),
  };

  let allEntries = [];

  async function fetchEntries() {
    const res = await fetch("/api/clock-entries");
    allEntries = await res.json();
    populateFilters();
    applyFilters();
  }

  function populateFilters() {
    const workers = [...new Set(allEntries.map(e => e.worker_name))];
    const projects = [...new Set(allEntries.map(e => e.project_name))];
    filters.worker.innerHTML = '<option value="">All</option>' + workers.map(w => `<option value="${w}">${w}</option>`).join('');
    filters.project.innerHTML = '<option value="">All</option>' + projects.map(p => `<option value="${p}">${p}</option>`).join('');
  }

  function formatDateTime(dtString) {
    const date = new Date(dtString);
    return isNaN(date) ? "Invalid" : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function applyFilters() {
    const start = filters.start.value ? new Date(filters.start.value) : null;
    const end = filters.end.value ? new Date(filters.end.value) : null;
    const worker = filters.worker.value;
    const project = filters.project.value;
    const sortBy = filters.sort.value;

    let filtered = allEntries.filter(entry => {
      const dt = new Date(entry.datetime_pst);
      const matchDate = (!start || dt >= start) && (!end || dt <= end);
      const matchWorker = !worker || entry.worker_name === worker;
      const matchProject = !project || entry.project_name === project;
      return matchDate && matchWorker && matchProject;
    });

    if (sortBy === "datetime") filtered.sort((a, b) => new Date(a.datetime_pst) - new Date(b.datetime_pst));
    else if (sortBy === "project") filtered.sort((a, b) => a.project_name.localeCompare(b.project_name));
    else if (sortBy === "worker") filtered.sort((a, b) => a.worker_name.localeCompare(b.worker_name));

    renderTable(filtered);
  }

  function renderTable(entries) {
    tableBody.innerHTML = "";
    for (const entry of entries) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${entry.id}</td>
        <td contenteditable="true" data-field="phone_number" data-id="${entry.id}">${entry.phone_number || ""}</td>
        <td contenteditable="true" data-field="worker_name" data-id="${entry.id}">${entry.worker_name || ""}</td>
        <td contenteditable="true" data-field="project_name" data-id="${entry.id}">${entry.project_name || ""}</td>
        <td contenteditable="true" data-field="action" data-id="${entry.id}">${entry.action || ""}</td>
        <td contenteditable="true" data-field="datetime_pst" data-id="${entry.id}">${formatDateTime(entry.datetime_pst)}</td>
        <td><button onclick="saveRow(${entry.id})">💾 Save</button></td>
      `;
      tableBody.appendChild(row);
    }
  }

  window.saveRow = async (id) => {
    const fields = [...document.querySelectorAll(`[data-id="${id}"]`)];
    const data = {};
    fields.forEach(cell => {
      const field = cell.getAttribute("data-field");
      const value = cell.textContent.trim();
      data[field] = field === "datetime_pst" ? new Date(value).toISOString() : value;
    });

    try {
      const res = await fetch(`/api/clock-entries/${id}/update-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Update failed");

      alert("✅ Entry updated");
      fetchEntries();
    } catch (err) {
      alert("❌ Failed to update entry");
    }
  };

  document.getElementById("applyFilters").addEventListener("click", applyFilters);
  document.getElementById("clearFilters").addEventListener("click", () => {
    filters.start.value = "";
    filters.end.value = "";
    filters.worker.value = "";
    filters.project.value = "";
    filters.sort.value = "datetime";
    applyFilters();
  });

  fetchEntries();
});
