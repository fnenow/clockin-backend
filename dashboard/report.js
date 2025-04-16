
document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.querySelector("#reportTable tbody");
  const workerFilter = document.getElementById("workerFilter");
  const projectFilter = document.getElementById("projectFilter");
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  let entries = [];

  async function fetchEntries() {
    const res = await fetch("/api/clock-entries");
    entries = await res.json();
    renderTable();
    populateFilters();
  }

  function populateFilters() {
    const workers = [...new Set(entries.map(e => e.worker_name).filter(Boolean))];
    const projects = [...new Set(entries.map(e => e.project_name).filter(Boolean))];

    workerFilter.innerHTML = '<option value="">All</option>' +
      workers.map(w => `<option value="${w}">${w}</option>`).join("");
    projectFilter.innerHTML = '<option value="">All</option>' +
      projects.map(p => `<option value="${p}">${p}</option>`).join("");
  }

  function renderTable() {
    const filtered = entries.filter(e => {
      const date = new Date(e.datetime_pst);
      const start = startDate.value ? new Date(startDate.value) : null;
      const end = endDate.value ? new Date(endDate.value) : null;
      const matchDate = (!start || date >= start) && (!end || date <= end);
      const matchWorker = !workerFilter.value || e.worker_name === workerFilter.value;
      const matchProject = !projectFilter.value || e.project_name === projectFilter.value;
      return matchDate && matchWorker && matchProject;
    });

    // Group by worker, date, project
    const grouped = {};
    filtered.forEach(e => {
      const date = new Date(e.datetime_pst).toLocaleDateString();
      const key = `${e.worker_name}|${e.project_name}|${date}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });

    tableBody.innerHTML = "";

    Object.entries(grouped).forEach(([key, group]) => {
      group.sort((a, b) => new Date(a.datetime_pst) - new Date(b.datetime_pst));
      for (let i = 0; i < group.length; i += 2) {
        const inEntry = group[i];
        const outEntry = group[i + 1] || {};

        const clockIn = inEntry.action === "Clock in" ? inEntry : outEntry;
        const clockOut = outEntry.action === "Clock out" ? outEntry : null;

        const clockInTime = clockIn ? new Date(clockIn.datetime_pst).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
        const clockOutTime = clockOut ? new Date(clockOut.datetime_pst).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

        const hoursWorked = (clockIn && clockOut)
          ? ((new Date(clockOut.datetime_pst) - new Date(clockIn.datetime_pst)) / 3600000).toFixed(2)
          : "";

        const payRate = clockIn?.pay_rate || "";
        const amount = payRate && hoursWorked ? (payRate * hoursWorked).toFixed(2) : "";

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${clockIn?.worker_name || ""}</td>
          <td>${clockIn?.phone_number?.slice(-5) || ""}</td>
          <td>${clockIn ? new Date(clockIn.datetime_pst).toLocaleDateString() : ""}</td>
          <td>${clockIn?.project_name || ""}</td>
          <td>${clockInTime}</td>
          <td>${clockOutTime}</td>
          <td>${hoursWorked}</td>
          <td>${payRate}</td>
          <td>${amount}</td>
        `;
        tableBody.appendChild(row);
      }
    });
  }

  document.getElementById("applyFilters").addEventListener("click", renderTable);
  document.getElementById("clearFilters").addEventListener("click", () => {
    startDate.value = "";
    endDate.value = "";
    workerFilter.value = "";
    projectFilter.value = "";
    renderTable();
  });

  document.getElementById("exportCSV").addEventListener("click", () => {
    const rows = [["Worker", "Phone", "Date", "Project", "Clock In", "Clock Out", "Hours", "Pay Rate", "Amount"]];
    document.querySelectorAll("#reportTable tbody tr").forEach(tr => {
      const cols = Array.from(tr.children).map(td => td.textContent);
      rows.push(cols);
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "report.csv";
    link.click();
  });

  fetchEntries();
});
