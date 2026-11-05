(() => {
  if (window.__qualistreamLoaded) return;
  window.__qualistreamLoaded = true;
  let settings = {enabled:false, brightness:100, contrast:110, saturation:105, sharpness:35};
  const managed = new Map();
  const definitions = new Map();
  const namespace = 'http://www.w3.org/2000/svg';
  let sequence = 0;
  function sharpenFor(root, value) {
    let item = definitions.get(root);
    if (!item) {
      const svg = document.createElementNS(namespace, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none;overflow:hidden';
      const defs = document.createElementNS(namespace, 'defs');
      const filter = document.createElementNS(namespace, 'filter');
      const id = `qualistream-sharpen-${Date.now()}-${sequence++}`;
      filter.setAttribute('id',id);
      filter.setAttribute('color-interpolation-filters','sRGB');
      const kernel = document.createElementNS(namespace, 'feConvolveMatrix');
      kernel.setAttribute('order','3'); kernel.setAttribute('edgeMode','duplicate');
      kernel.setAttribute('preserveAlpha','true');
      filter.appendChild(kernel); defs.appendChild(filter); svg.appendChild(defs);
      (root === document ? document.documentElement : root).appendChild(svg);
      item={svg,kernel,id}; definitions.set(root,item);
    }
    const strength = Math.max(0,Math.min(100,Number(value)||0))/100;
    item.kernel.setAttribute('kernelMatrix',`0 ${-strength} 0 ${-strength} ${1+4*strength} ${-strength} 0 ${-strength} 0`);
    return `url(#${item.id})`;
  }
  let timer = null;
  const observed = new WeakSet();
  const observer = new MutationObserver(schedule);
  function observe(root) {
    if (observed.has(root)) return;
    observed.add(root);
    observer.observe(root, {childList:true, subtree:true});
  }
  function videosIn(root, found) {
    for (const element of root.querySelectorAll('*')) {
      if (element.tagName === 'VIDEO') found.add(element);
      if (element.shadowRoot) { observe(element.shadowRoot); videosIn(element.shadowRoot, found); }
    }
  }
  function restore(video, record) {
    // Preserve a filter changed by the page after the extension applied its own.
    if (video.style.getPropertyValue('filter') === record.applied) {
      if (record.inline) video.style.setProperty('filter',record.inline,record.priority);
      else video.style.removeProperty('filter');
    }
  }
  function scan() {
    timer = null;
    const found = new Set(); videosIn(document, found);
    for (const [video, record] of managed) {
      if (!found.has(video) || !settings.enabled) { restore(video,record); managed.delete(video); }
    }
    if (settings.enabled) for (const video of found) {
      let record = managed.get(video);
      if (!record) {
        const inline=video.style.getPropertyValue('filter');
        const priority=video.style.getPropertyPriority('filter');
        const computed=getComputedStyle(video).filter;
        record={inline,priority,base:computed && computed !== 'none' ? computed : '',applied:''};
        managed.set(video,record);
      } else if (record.applied && video.style.getPropertyValue('filter') !== record.applied) {
        // The player changed its inline filter. Treat its new value as the base.
        record.inline=video.style.getPropertyValue('filter');
        record.priority=video.style.getPropertyPriority('filter');
        const computed=getComputedStyle(video).filter;
        record.base=computed && computed !== 'none' ? computed : '';
      }
      const sharpness = settings.sharpness > 0 ? sharpenFor(video.getRootNode(),settings.sharpness) : '';
      const filter=`${record.base} ${sharpness} brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`.trim();
      video.style.setProperty('filter',filter,'important');
      record.applied=video.style.getPropertyValue('filter');
    }
    if (!settings.enabled) { for (const item of definitions.values()) item.svg.remove(); definitions.clear(); }
    return {detected:found.size,applied:managed.size};
  }
  function schedule() { if (!settings.enabled) return; if (timer === null) timer=setTimeout(scan,150); }
  observe(document);
  // Poll for shadow roots added after the host was inserted and for SPA navigation.
  setInterval(schedule,2500);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type === 'APPLY_SETTINGS') { settings=message.settings; respond(scan()); }
    else if (message.type === 'GET_STATUS') respond(scan());
  });
  chrome.runtime.sendMessage({type:'GET_SETTINGS'}).then(value=>{if(value && !value.error) settings=value; scan();}).catch(()=>scan());
})();
