// Each tab has independent settings, preserved across service-worker restarts.
const defaults = { enabled: false, brightness: 100, contrast: 110, saturation: 105, sharpness: 35 };
const key = id => `tab:${id}`;
async function getSettings(id) {
  const result = await chrome.storage.session.get(key(id));
  return { ...defaults, ...result[key(id)] };
}
async function frames(tabId) {
  try { return await chrome.webNavigation.getAllFrames({tabId}) || []; }
  catch { return []; }
}
async function broadcast(tabId, message) {
  return Promise.all((await frames(tabId)).map(async frame => {
    try { return await chrome.tabs.sendMessage(tabId, message, {frameId: frame.frameId}); }
    catch { return null; }
  }));
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  (async () => {
    if (message.type === 'GET_SETTINGS' && sender.tab?.id != null) return getSettings(sender.tab.id);
    if (message.type === 'GET_TAB' || message.type === 'SET_TAB') {
      const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
      if (tab?.id == null) return {error:'No active browser tab.'};
      let settings = await getSettings(tab.id);
      if (message.type === 'SET_TAB') {
        const update = message.settings || {};
        if (typeof update.enabled === 'boolean') settings.enabled = update.enabled;
        for (const field of ['brightness','contrast','saturation','sharpness']) {
          if (typeof update[field] === 'number' && Number.isFinite(update[field])) settings[field] = Math.max(field === 'sharpness' ? 0 : 50, Math.min(field === 'sharpness' ? 100 : 150, update[field]));
        }
        await chrome.storage.session.set({[key(tab.id)]:settings});
        await broadcast(tab.id, {type:'APPLY_SETTINGS', settings});
      }
      const results = await broadcast(tab.id, {type:'GET_STATUS'});
      const states=results.filter(Boolean);
      const bufferValues=states.map(s=>s.bufferedSeconds).filter(v=>typeof v === 'number' && Number.isFinite(v));
      return {settings, frames:states.length, detected:states.reduce((n,s)=>n+(s.detected||0),0), applied:states.reduce((n,s)=>n+(s.applied||0),0), playing:states.reduce((n,s)=>n+(s.playing||0),0), buffering:states.reduce((n,s)=>n+(s.buffering||0),0), bufferedSeconds:bufferValues.length ? Math.min(...bufferValues) : null};
    }
    return {};
  })().then(respond).catch(e=>respond({error:String(e)}));
  return true;
});
chrome.tabs.onRemoved.addListener(id => { chrome.storage.session.remove(key(id)); });
