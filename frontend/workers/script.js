async function loadWorkers() {
  const res = await fetch('/api/workers');
  const workers = await res.json();

  const container = document.getElementById('workers');
  container.innerHTML = workers.map(worker => `
    <div>
      <strong>${worker.name}</strong> (${worker.phone_number}) - $${worker.pay_rate}/hr
    </div>
  `).join('');
}

document.getElementById('addWorkerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('workerName').value;
  const phone = document.getElementById('workerPhone').value;
  const payRate = document.getElementById('payRate').value;

  await fetch('/api/workers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone_number: phone, pay_rate: payRate })
  });

  loadWorkers();
});
