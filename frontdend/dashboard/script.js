async function loadEntries() {
  const res = await fetch('/api/time');
  const entries = await res.json();

  const container = document.getElementById('entries');
  container.innerHTML = entries.map(entry => `
    <div>
      <strong>${entry.worker_name}</strong> 
      clocked in at ${new Date(entry.clock_in).toLocaleString('en-US')} 
      ${entry.clock_out ? ` and out at ${new Date(entry.clock_out).toLocaleString('en-US')}` : '(still working)'}
      <p>${entry.notes || ''}</p>
    </div>
  `).join('');
}
