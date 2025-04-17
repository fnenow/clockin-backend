document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#reportTable tbody");

  async function fetchReport() {
    const res = await fetch("/api/clock-entries/report");
    const data = await res.json();
    renderTable(data);
  }

  function renderTable(entries) {
    tableBody.innerHTML = "";

    entries.forEach(entry => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${entry.worker_name}</td>
        <td>${entry.phone_last5}</td>
        <td>${entry.date}</td>
        <td>${entry.project_name}</td>
        <td>${entry.in_time || '<button data-action="add-in" data-worker="' + entry.worker_name + '" data-date="' + entry.date + '" data-project="' + entry.project_name + '">Add In</button>'}</td>
        <td>${entry.out_time || '<button data-action="add-out" data-worker="' + entry.worker_name + '" data-date="' + entry.date + '" data-project="' + entry.project_name + '">Add Out</button>'}</td>
        <td>${entry.hours || 0}</td>
        <td>${entry.pay_rate}</td>
        <td>${entry.amount}</td>
      `;

      tableBody.appendChild(row);
    });

    addButtonListeners();
  }

  function addButtonListeners() {
    const buttons = document.querySelectorAll("button[data-action]");
    buttons.forEach(button => {
      button.addEventListener("click", async () => {
        const action = button.getAttribute("data-action");
        const worker = button.getAttribute("data-worker");
        const date = button.getAttribute("data-date");
        const project = button.getAttribute("data-project");

        const time = prompt(`Enter time for ${action} (HH:mm):`);
        if (!time) return alert("No time entered.");

        const datetime = new Date(`${date}T${time}:00-07:00`).toISOString();

        try {
          const res = await fetch("/api/clock-entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              worker_name: worker,
              project_name: project,
              action: action === "add-in" ? "Clock in" : "Clock out",
              datetime,
              phone_number: "0000000000", // or fetch by worker_name if desired
              note: "[manual add]"
            })
          });

          if (!res.ok) throw new Error("Failed to add entry");
          alert("Entry added!");
          fetchReport();
        } catch (err) {
          alert("Error: " + err.message);
        }
      });
    });
  }

  fetchReport();
});
