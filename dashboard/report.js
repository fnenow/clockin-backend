document.addEventListener("DOMContentLoaded", () => {
  const tableBody     = document.getElementById("reportTable");
  const workerFilter  = document.getElementById("workerFilter");
  const projectFilter = document.getElementById("projectFilter");
  const startDateEl   = document.getElementById("startDate");
  const endDateEl     = document.getElementById("endDate");
  const filterBtn     = document.getElementById("filterButton");
  const clearBtn      = document.getElementById("clearButton");
  const exportBtn     = document.getElementById("exportButton");

  let reportData = [];

  // Fetch report data from new endpoint
  async function fetchReportData() {
    try {
      const res = await fetch("/api/clock-entries/report");
      if (!res.ok) throw new Error("Network response was not ok");
      reportData = await res.json();
      console.log("Report data:", reportData);
      populateFilters();
      renderTable();
    } catch (err) {
      console.error("Error fetching report data:", err);
    }
  }

  // Fill worker & project dropdowns
  function populateFilters() {
    const workers  = [...new Set(reportData.map(r => r.worker_name).filter(Boolean))];
    const projects = [...new Set(reportData.map(r => r.project_name).filter(Boolean))];

    workerFilter.innerHTML  = `<option value="">All Workers</option>` +
      workers.map(w => `<option>${w}</option>`).join("");
    projectFilter.innerHTML = `<option value="">All Projects</option>` +
      projects.map(p => `<option>${p}</option>`).join("");
  }

  // Render the table rows based on filters
  function renderTable() {
    tableBody.innerHTML = "";
    const start   = startDateEl.value ? new Date(startDateEl.value) : null;
    const end     = endDateEl.value   ? new Date(endDateEl.value)   : null;
    const worker  = workerFilter.value;
    const project = projectFilter.value;

    reportData
      .filter(r => {
        const date = new Date(r.date);
        const matchDate   = (!start || date >= start) && (!end || date <= end);
        const matchWorker = !worker  || r.worker_name === worker;
        const matchProj   = !project || r.project_name === project;
        return matchDate && matchWorker && matchProj;
      })
      .forEach(r => {
        const tr = document.createElement("tr");
        const inTime  = r.clock_in  ? new Date(r.clock_in).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : "";
        const outTime = r.clock_out ? new Date(r.clock_out).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : "";
        tr.innerHTML = `
          <td>${r.worker_name}</td>
          <td>${r.phone_last5}</td>
          <td>${r.date}</td>
          <td>${r.project_name}</td>
          <td>${inTime}</td>
          <td>${outTime}</td>
          <td>${r.hours ?? ""}</td>
          <td>${r.pay_rate ?? ""}</td>
          <td>${r.amount ?? ""}</td>
        `;
        tableBody.appendChild(tr);
      });
  }

  // Export visible rows as CSV
  function exportToCSV() {
    const rows = [["Worker","Phone","Date","Project","Clock In","Clock Out","Hours","Pay Rate","Amount"]];
    document.querySelectorAll("#reportTable tr").forEach(tr => {
      const cols = Array.from(tr.children).map(td => td.textContent);
      rows.push(cols);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "time-report.csv";
    a.click();
  }

  filterBtn.addEventListener("click", renderTable);
  clearBtn.addEventListener("click", () => {
    startDateEl.value = "";
    endDateEl.value   = "";
    workerFilter.value  = "";
    projectFilter.value = "";
    renderTable();
  });
  exportBtn.addEventListener("click", exportToCSV);

  fetchReportData();
});
