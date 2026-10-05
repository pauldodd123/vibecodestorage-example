const $ = id => document.getElementById(id);
let version;
function preview() { $('project-title').textContent = $('project').value || 'Your next idea'; $('next-title').textContent = $('next-step').value; $('desk').dataset.theme = $('theme').value; }
for (const id of ['project', 'next-step', 'theme']) $(id).addEventListener('input', preview);
async function load() {
  try {
    const response = await fetch('/api/settings'); const data = await response.json(); if (!response.ok) throw new Error(data.error);
    version = data.version; $('project').value = data.settings.project; $('theme').value = data.settings.theme; $('next-step').value = data.settings.nextStep;
    $('status').textContent = data.restored ? 'Restored from your encrypted store.' : 'Ready for your first save.';
    $('saved-label').textContent = data.restored ? 'Restored · ready to continue' : 'Make it yours';
    $('run').textContent = 'Backend run: ' + data.runId.slice(0, 8) + ' · changes each time the process starts.';
    $('save').disabled = false; preview();
  } catch (error) { $('status').textContent = error.message || 'Could not load. Refresh to retry.'; }
}
$('settings').addEventListener('submit', async event => {
  event.preventDefault(); $('save').disabled = true; $('status').textContent = 'Encrypting and saving…';
  try {
    const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({project:$('project').value,theme:$('theme').value,nextStep:$('next-step').value,version}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    version = data.version; $('status').textContent = 'Saved. You can restart the app now.'; $('saved-label').textContent = 'Saved to your encrypted store';
  } catch (error) { $('status').textContent = error.message || 'Could not save. Your edits are still here.'; }
  finally { $('save').disabled = false; }
});
load();
