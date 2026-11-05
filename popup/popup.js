const fields=['brightness','contrast','saturation','sharpness'];
const enabled=document.getElementById('enabled');
const status=document.getElementById('status');
let updateTimer;
function show(data) {
  if (!data || data.error) { status.textContent=data?.error || 'Cannot access this tab. Open a regular website and reload it.'; return; }
  enabled.checked=data.settings.enabled;
  for(const field of fields){document.getElementById(field).value=data.settings[field];document.getElementById(`${field}Value`).textContent=`${data.settings[field]}%`;}
  status.textContent = !data.frames ? 'This page cannot be accessed. Open a regular website and reload it.' : data.detected ? `${data.detected} video(s) found across ${data.frames} accessible frame(s). ${data.settings.enabled ? `${data.applied} filter(s) applied; player support varies.` : 'Enhancement is off.'}` : 'No HTML video found yet. Start playback or reload the page.';
}
async function send(type,settings){ try { show(await chrome.runtime.sendMessage({type,settings})); } catch {status.textContent='Could not connect to the extension. Reload this page.';} }
enabled.addEventListener('change',()=>send('SET_TAB',{enabled:enabled.checked}));
for(const field of fields) document.getElementById(field).addEventListener('input',event=>{
  document.getElementById(`${field}Value`).textContent=`${event.target.value}%`;
  clearTimeout(updateTimer); updateTimer=setTimeout(()=>{ const settings={}; for(const f of fields) settings[f]=Number(document.getElementById(f).value); send('SET_TAB',settings); },100);
});
document.getElementById('reset').addEventListener('click',()=>send('SET_TAB',{brightness:100,contrast:110,saturation:105,sharpness:35}));
send('GET_TAB');
