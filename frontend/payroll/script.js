document.getElementById('filterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;

  const res = await fetch(`/api/payroll?start=${start}&end=${end}`);
  const report = await res.json();

  const container = document.getElementById('payrollReport');
  container.innerHTML = report.map(item => `
    <div>
      <strong>${item.worker_name}</strong>: $${parseFloat(item.total_pay).toFixed(2)} for ${parseFloat(item.total_hours).toFixed(2)} hrs
    </div>
  `).join('');
});
