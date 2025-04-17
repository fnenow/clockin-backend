document.addEventListener("DOMContentLoaded", () => {
  const tbody     = document.getElementById("reportTable");
  const wf        = document.getElementById("workerFilter");
  const pf        = document.getElementById("projectFilter");
  const sd        = document.getElementById("startDate");
  const ed        = document.getElementById("endDate");
  const btnFilter = document.getElementById("filterButton");
  const btnClear  = document.getElementById("clearButton");
  const btnExport = document.getElementById("exportButton");

  let reportData = [];

  async function loadReport() {
    const res = await fetch("/api/clock-entries/report");
    reportData = await res.json();
    populateFilters();
    renderRows();
  }

  function populateFilters() {
    const workers  = [...new Set(reportData.map(r => r.worker_name))];
    const projects = [...new Set(reportData.map(r => r.project_name))];
    wf.innerHTML = `<option value="">All</option>`
      + workers.map(w => `<option>${w}</option>`).join("");
    pf.innerHTML = `<option value="">All</option>`
      + projects.map(p => `<option>${p}</option>`).join("");
  }

  function renderRows() {
    tbody.innerHTML = "";
    const start = sd.value ? new Date(sd.value) : null;
    const end   = ed.value ? new Date(ed.value)   : null;

    reportData
      .filter(r => {
        const d = new Date(r.date);
        return (!start || d >= start) &&
               (!end   || d <= end)   &&
               (!wf.value || r.worker_name === wf.value) &&
               (!pf.value || r.project_name === pf.value);
      })
      .forEach(r => {
        const tr   = document.createElement("tr");
        const inT  = r.clock_in  ? new Date(r.clock_in).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : "";
        const outT = r.clock_out ? new Date(r.clock_out).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : "";

        const buttons = [];
        if (!r.clock_in)  buttons.push(`<button class="add-btn" data-type="in">Add In</button>`);
        if (!r.clock_out) buttons.push(`<button class="add-btn" data-type="out">Add Out</button>`);

        tr.innerHTML = `
          <td>${r.worker_name}</td>
          <td>${r.phone_last5}</td>
          <td>${r.date}</td>
          <td>${r.project_name}</td>
          <td>${inT}</td>
          <td>${outT}</td>
          <td>${r.hours ?? ""}</td>
          <td>${r.pay_rate ?? ""}</td>
          <td>${r.amount ?? ""}</td>
          <td>${buttons.join(" ")}</td>
        `;
        tbody.appendChild(tr);
      });

    document.querySelectorAll(".add-btn").forEach(btn => {
      btn.onclick = async () => {
        const type    = btn.dataset.type === "in" ? "Clock in" : "Clock out";
        const cols    = btn.closest("tr").children;
        const phone5  = cols[1].textContent;
        const worker  = cols[0].textContent;
        const project = cols[3].textContent;
        const nowISO  = new Date().toISOString();

        const payload = {
          phone_number: "xxxxx" + phone5,
          worker_name:  worker,
          project_name: project,
          action:       type,
          datetime:     nowISO,
          note:         ""
        };

        await fetch("/api/clock-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        await loadReport();
      };
    });
  }

  function exportToCSV() {
    const rows = [["Worker","Phone","Date","Project","In","Out","Hours","Rate","Amount"]];
    document.querySelectorAll("#reportTable tr").forEach(tr => {
      const cols = [...tr.children].map(td => td.textContent);
      rows.push(cols);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "time-report.csv";
    a.click();
  }

  btnFilter.addEventListener("click", renderRows);
  btnClear .addEventListener("click", () => {
    sd.value = ed.value = "";
    wf.value = pf.value = "";
    renderRows();
  });
  btnExport.addEventListener("click", exportToCSV);

  loadReport();
});
