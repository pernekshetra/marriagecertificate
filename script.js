(() => {
  function requestRedraw() {
    if(rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => { rafId = null; draw(); });
  }

  function hitTest(x, y) {
    const keys = Array.from(items.keys());
    for(let i = keys.length - 1; i >= 0; i--) {
      const it = items.get(keys[i]);
      ctx.save();
      ctx.font = `${it.bold ? '700 ' : ''}${it.size}px ${it.font}`;
      const isAddress = /address$/.test(it.key);
      if(isAddress) {
        const m = measureWrapped(it.text, it.wrapWidth, it.size, it.lineHeight || defaults.lineHeight);
        let left = it.x, top = it.y - it.size;
        if(it.align === 'center') {
          left = it.x - m.maxLineW / 2;
        }
        else if(it.align === 'right') {
          left = it.x - m.maxLineW;
        }
        const inside = (x >= left && x <= left + m.maxLineW && y >= top && y <= top + m.height);
        ctx.restore();
        if(inside) {
          return it.key;
        }
      }
      else {
        const w = ctx.measureText(it.text || '').width;
        const h = it.size;
        let left = it.x, top = it.y - h;
        if(it.align === 'center') {
          left = it.x - w / 2;
        }
        else if(it.align === 'right') {
          left = it.x - w;
        }
        const inside = (x >= left && x <= left + w && y >= top && y <= top + h);
        ctx.restore();
        if(inside) {
          return it.key;
        }
      }
    }
    return null;
  }

  function selectOnly(key) {
    selectedKeys.clear();
    if(key) {
      selectedKeys.add(key);
    }
  }

  function syncInspector() {}

  function bindField(key, el) {
    ensureItem(key);
    const update = () => {
      items.get(key).text = el.value;
      draw();
    };
    el.addEventListener('input', update);
    update();
  }

  function draw() {
    const W = canvas.width / DPR, H = canvas.height / DPR;
    ctx.clearRect(0, 0, W, H);

    if(bgReady && bg.complete && bg.naturalWidth) {
      const ratio = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
      const iw = bg.naturalWidth * ratio, ih = bg.naturalHeight * ratio;
      const ix = (W - iw) / 2, iy = (H - ih) / 2;
      ctx.drawImage(bg, ix, iy, iw, ih);
    }

    for(const it of items.values()) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate((it.rot || 0) * Math.PI / 180);

      ctx.font = `${it.bold ? '700 ' : ''}${it.size}px ${it.font}`;
      ctx.fillStyle = it.color;
      ctx.textAlign = it.align;
      ctx.textBaseline = 'alphabetic';

      if(it.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
      }
      else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      const isAddress = /address$/.test(it.key);
      if(isAddress) {
        const lh = Math.round(it.size * defaults.lineHeight);
        drawWrappedText((it.text || '').trim(), 0, 0, it.wrapWidth, lh, it.align);
      }
      else {
        ctx.fillText(it.text || '', 0, 0);
      }

      if(selectedKeys.has(it.key)) {
        let boxW, boxH, x0 = 0, y0 = -it.size;

        if(/address$/.test(it.key)) {
          const m = measureWrapped(it.text, it.wrapWidth, it.size, it.lineHeight || defaults.lineHeight);
          boxW = m.maxLineW;
          boxH = m.height;
        }
        else {
          boxW = ctx.measureText(it.text || '').width;
          boxH = it.size;
        }

        if(it.align === 'center') {
          x0 = -boxW / 2;
        }
        else if(it.align === 'right') {
          x0 = -boxW;
        }

        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.strokeRect(x0 - 6, y0 - 6, boxW + 12, boxH + 12);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  function measureWrapped(text, maxWidth, size, lineHeightMultiplier) {
    const words = (text || '').trim().split(/\s+/);
    let line = '', lines = [], maxLineW = 0;

    for(let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      const w = ctx.measureText(test).width;
      if(w > maxWidth && i > 0) {
        lines.push(line);
        maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
        line = words[i];
      }
      else {
        line = test;
      }
    }
    if(line) {
      lines.push(line);
      maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
    }

    const lineH = Math.round(size * lineHeightMultiplier);
    const height = lines.length * lineH;
    return { lines, maxLineW, lineH, height };
  }

  function drawWrappedText(text, x, y, maxWidth, lineHeightPx, align) {
    const words = text.split(/\s+/);
    let line = '';
    let cursorY = y;
    const lines = [];

    for(let n = 0; n < words.length; n++) {
      const testLine = line ? line + ' ' + words[n] : words[n];
      const metrics = ctx.measureText(testLine);
      if(metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n];
      } else {
        line = testLine;
      }
    }
    if(line) {
      lines.push(line);
    }

    for(const ln of lines) {
      ctx.fillText(ln, x, cursorY);
      cursorY += lineHeightPx;
    }
  }

  function scaleForDPR() {
    const cssW = canvas.width, cssH = canvas.height;
    canvas.width = cssW * DPR;
    canvas.height = cssH * DPR;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw();
  }

  function ensureItem(key) {
    if (!items.has(key)) {
      const base = {
        key,
        x: 0,
        y: 0,
        text: '',
        ...defaults,
        ...(presetStyles[key] || {}),
      };
      items.set(key, base);
    }
    return items.get(key);
  }

  function initialDraw() {
    const W = canvas.width / DPR;
    const H = canvas.height / DPR;
    const midX = W / 2;

    ensureItem('p1_name');
    ensureItem('p1_parents');
    ensureItem('p1_address');
    ensureItem('and');
    ensureItem('p2_name');
    ensureItem('p2_parents');
    ensureItem('p2_address');
    ensureItem('marriage_date');
    ensureItem('registration_number');

    items.get('p1_name').x = midX;
    items.get('p1_name').y = H * 0.35;

    items.get('p1_parents').x = midX;
    items.get('p1_parents').y = H * 0.39;

    items.get('p1_address').x = midX;
    items.get('p1_address').y = H * 0.42;

    items.get('and').x = midX;
    items.get('and').y = H * 0.51;

    items.get('p2_name').x = midX;
    items.get('p2_name').y = H * 0.58;

    items.get('p2_parents').x = midX;
    items.get('p2_parents').y = H * 0.62;

    items.get('p2_address').x = midX;
    items.get('p2_address').y = H * 0.65;

    items.get('marriage_date').x = midX;
    items.get('marriage_date').y = H * 0.73;

    items.get('registration_number').x = midX;
    items.get('registration_number').y = H * 0.78;

    const els = ['p1_name', 'p1_parents', 'p1_address', 'and', 'p2_name', 'p2_parents', 'p2_address', 'marriage_date', 'registration_number'];
    for(const k of els) {
      items.get(k).align = 'center';
    }
    draw();
  }

  function sanitizeFilename(value) {
    return (value || '')
      .toString()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .toLowerCase();
  }

  function buildFilenameFromEntry(entry, index) {
    const groom = sanitizeFilename(entry?.p1_name);
    const bride = sanitizeFilename(entry?.p2_name);
    const reg = sanitizeFilename(entry?.registration_number);
    const parts = [];
    if(groom) parts.push(groom);
    if(bride) parts.push(bride);
    if(reg) parts.push(reg);
    if(parts.length) {
      return parts.join('_');
    }
    if(typeof index === 'number') {
      return `entry-${index + 1}`;
    }
    return 'certificate';
  }

  function entryLabel(entry, index) {
    const reg = (entry.registration_number || '').trim();
    const groom = (entry.p1_name || '').trim();
    const bride = (entry.p2_name || '').trim();
    let label = reg ? reg : `Entry ${index + 1}`;
    if(groom || bride) {
      const pair = [groom, bride].filter(Boolean).join(' & ');
      label += ` \u2022 ${pair}`;
    }
    return label;
  }

  function createEntry(seed = {}) {
    const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `entry_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return {
      id,
      p1_name: '',
      p1_parents: '',
      p1_address: '',
      p2_name: '',
      p2_parents: '',
      p2_address: '',
      marriage_date: '',
      registration_number: '',
      ...seed
    };
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      return parsed.map(entry => createEntry(entry));
    }
    catch {
      return [];
    }
  }

  function getCurrentEntry() {
    return entries.find(entry => entry.id === currentEntryId) || null;
  }

  function updateCurrentEntryFromFields() {
    const entry = getCurrentEntry();
    if(!entry) return;
    for(const key of fieldKeys) {
      entry[key] = fields[key].value;
    }
    saveEntries();
    renderEntryList();
  }

  function applyEntryToFields(entry) {
    if(!entry) return;
    isApplyingEntry = true;
    for(const key of fieldKeys) {
      fields[key].value = entry[key] || '';
    }
    for(const key of fieldKeys) {
      fields[key].dispatchEvent(new Event('input'));
    }
    isApplyingEntry = false;
  }

  function selectEntry(id) {
    currentEntryId = id;
    const entry = getCurrentEntry();
    applyEntryToFields(entry);
    renderEntryList();
  }

  function renderEntryList() {
    entryList.innerHTML = '';
    entries.forEach((entry, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'entry-button';
      if(entry.id === currentEntryId) {
        button.classList.add('active');
      }
      button.textContent = entryLabel(entry, index);
      button.addEventListener('click', () => selectEntry(entry.id));
      li.appendChild(button);
      entryList.appendChild(li);
    });
  }

  function ensureEntrySelection() {
    if(entries.length === 0) {
      const entry = createEntry();
      entries.push(entry);
      currentEntryId = entry.id;
      saveEntries();
    }
    if(!currentEntryId || !entries.find(entry => entry.id === currentEntryId)) {
      currentEntryId = entries[0].id;
    }
  }

  const STORAGE_KEY = 'mc_admin_entries_v1';
  const fieldKeys = ['p1_name', 'p1_parents', 'p1_address', 'p2_name', 'p2_parents', 'p2_address', 'marriage_date', 'registration_number'];

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;

  let bgReady = false;
  const bg = new Image();
  bg.onload = () => { bgReady = true; draw(); };
  bg.src = 'base.png';

  const downloadBtn = document.getElementById('download');
  const downloadAllBtn = document.getElementById('downloadAll');
  const togglePreviewBtn = document.getElementById('togglePreview');
  const detailsGrid = document.getElementById('detailsGrid');
  const deleteDialog = document.getElementById('deleteDialog');
  const addEntryBtn = document.getElementById('addEntry');
  const duplicateEntryBtn = document.getElementById('duplicateEntry');
  const deleteEntryBtn = document.getElementById('deleteEntry');
  const entryList = document.getElementById('entryList');

  const inspectorEls = [];

  const fields = {
    p1_name: document.getElementById('p1_name'),
    p1_parents: document.getElementById('p1_parents'),
    p1_address: document.getElementById('p1_address'),
    p2_name: document.getElementById('p2_name'),
    p2_parents: document.getElementById('p2_parents'),
    p2_address: document.getElementById('p2_address'),
    marriage_date: document.getElementById('marriage_date'),
    registration_number: document.getElementById('registration_number')
  };

  const items = new Map();
  let selectedKeys = new Set();

  const defaults = {
    font: 'system-ui, sans-serif',
    size: 28,
    color: '#000000',
    shadow: false,
    align: 'center',
    bold: false,
    draggable: true,
    wrapWidth: 400,
    lineHeight: 1.25,
  };

  const presetStyles = {
    p1_parents: { size: 22, lineHeight: 1.25, bold: true },
    p1_address: { size: 20, lineHeight: 1.3, bold: true, wrapWidth: 420 },

    p2_parents: { size: 22, lineHeight: 1.25, bold: true },
    p2_address: { size: 20, lineHeight: 1.3, bold: true, wrapWidth: 420 },

    marriage_date: { size: 20, bold: true },
    registration_number: { size: 20, bold: true }
  };

  let entries = loadEntries();
  let currentEntryId = null;
  let isApplyingEntry = false;

  function setPreviewVisible(show) {
    if(show) {
      canvas.classList.remove('preview-hidden');
      togglePreviewBtn.textContent = 'Hide Preview';
      requestRedraw();
    }
    else {
      canvas.classList.add('preview-hidden');
      togglePreviewBtn.textContent = 'Show Preview';
    }
  }

  function hidePreviewAndScrollToFields() {
    setPreviewVisible(false);
    if(detailsGrid) {
      requestAnimationFrame(() => {
        const before = window.scrollY;
        detailsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstField = fields.p1_name;
        if(firstField) {
          firstField.focus({ preventScroll: true });
        }
        setTimeout(() => {
          if(Math.abs(window.scrollY - before) < 2) {
            detailsGrid.classList.add('pulse-focus');
            setTimeout(() => detailsGrid.classList.remove('pulse-focus'), 700);
          }
        }, 220);
      });
    }
  }

  scaleForDPR();
  let rafId = null;

  window.addEventListener('resize', requestRedraw);
  window.addEventListener('scroll', requestRedraw, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestRedraw(); });
  window.addEventListener('orientationchange', requestRedraw);
  window.addEventListener('pageshow', requestRedraw);

  setPreviewVisible(false);

  initialDraw();

  bindField('p1_name', fields.p1_name);
  bindField('p1_address', fields.p1_address);
  bindField('p1_parents', fields.p1_parents);

  bindField('p2_name', fields.p2_name);
  bindField('p2_parents', fields.p2_parents);
  bindField('p2_address', fields.p2_address);

  ensureItem('and');
  items.get('and').text = 'AND';
  items.get('and').size = 28;
  items.get('and').bold = false;
  items.get('and').color = '#000000';

  bindField('marriage_date', fields.marriage_date);
  bindField('registration_number', fields.registration_number);

  for(const key of fieldKeys) {
    fields[key].addEventListener('input', () => {
      if(isApplyingEntry) return;
      updateCurrentEntryFromFields();
    });
  }

  // Selected text properties removed in admin view.

  let draggingKey = null;
  let dragOffset = {x: 0, y: 0};

  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const key = hitTest(x, y);

    if(key) {
      if(e.shiftKey) {
        if(selectedKeys.has(key)) {
          selectedKeys.delete(key);
        }
        else {
          selectedKeys.add(key);
        }
      }
      else {
        selectOnly(key);
      }
      draggingKey = key;
      const it = items.get(key);
      dragOffset.x = x - it.x;
      dragOffset.y = y - it.y;
      canvas.style.cursor = 'move';
      syncInspector();
      draw();
    }
    else {
      if(!e.shiftKey) {
        selectedKeys.clear();
        syncInspector();
        draw();
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if(!draggingKey) {
      return;
    }
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const dx = x - dragOffset.x - items.get(draggingKey).x;
    const dy = y - dragOffset.y - items.get(draggingKey).y;
    for(const key of selectedKeys) {
      const it = items.get(key);
      it.x += dx;
      it.y += dy;
    }
    draw();
  });

  window.addEventListener('mouseup', () => {
    draggingKey = null;
    canvas.style.cursor = 'default';
  });

  window.addEventListener('keydown', (e) => {
    if((e.key === 'Delete' || e.key === 'Backspace') && selectedKeys.size) {
      e.preventDefault();
      for(const key of selectedKeys) {
        items.delete(key);
      }
      selectedKeys.clear();
      syncInspector();
      draw();
    }
  });

  function renderExportToCanvas(targetCanvas, scale = 2) {
    const W = canvas.width / DPR, H = canvas.height / DPR;
    targetCanvas.width = W * scale;
    targetCanvas.height = H * scale;
    const ex = targetCanvas.getContext('2d');
    ex.scale(scale, scale);

    if(bg.complete && bg.naturalWidth) {
      const ratio = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
      const iw = bg.naturalWidth * ratio, ih = bg.naturalHeight * ratio;
      const ix = (W - iw) / 2, iy = (H - ih) / 2;
      ex.drawImage(bg, ix, iy, iw, ih);
    }

    for(const it of items.values()) {
      ex.save();
      ex.translate(it.x, it.y);
      ex.rotate((it.rot || 0) * Math.PI / 180);

      ex.font = `${it.bold ? '700 ' : ''}${it.size}px ${it.font}`;
      ex.fillStyle = it.color;
      ex.textAlign = it.align;
      ex.textBaseline = 'alphabetic';

      if(it.shadow) {
        ex.shadowColor = 'rgba(0,0,0,0.6)';
        ex.shadowBlur = 8;
        ex.shadowOffsetX = 0;
        ex.shadowOffsetY = 2;
      }
      else {
        ex.shadowColor = 'transparent';
        ex.shadowBlur = 0;
        ex.shadowOffsetX = 0;
        ex.shadowOffsetY = 0;
      }

      if(/address$/.test(it.key)) {
        const lh = Math.round(it.size * defaults.lineHeight);
        const words = (it.text || '').trim().split(/\s+/);
        let line = '', cursorY = 0, lines = [];
        for(let n = 0; n < words.length; n++) {
          const test = line ? line + ' ' + words[n] : words[n];
          if(ex.measureText(test).width > it.wrapWidth && n > 0) {
            lines.push(line); line = words[n];
          }
          else {
            line = test;
          }
        }
        if(line) {
          lines.push(line);
        }
        for(const ln of lines) {
          ex.fillText(ln, 0, cursorY);
          cursorY += lh;
        }
      }
      else {
        ex.fillText(it.text || '', 0, 0);
      }
      ex.restore();
    }
  }

  downloadBtn.addEventListener('click', () => {
    const entry = getCurrentEntry();
    const filenameBase = buildFilenameFromEntry(entry);
    const exCanvas = document.createElement('canvas');
    renderExportToCanvas(exCanvas);
    const a = document.createElement('a');
    a.download = `${filenameBase}.png`;
    a.href = exCanvas.toDataURL('image/png');
    a.click();
  });

  downloadAllBtn.addEventListener('click', () => {
    if(entries.length === 0) return;
    const originalId = currentEntryId;
    let index = 0;

    const downloadNext = () => {
      if(index >= entries.length) {
        selectEntry(originalId);
        return;
      }
      const entry = entries[index];
      currentEntryId = entry.id;
      applyEntryToFields(entry);
      const filenameBase = buildFilenameFromEntry(entry, index);
      const exCanvas = document.createElement('canvas');
      renderExportToCanvas(exCanvas);
      const a = document.createElement('a');
      a.download = `${filenameBase}.png`;
      a.href = exCanvas.toDataURL('image/png');
      a.click();
      index += 1;
      setTimeout(downloadNext, 350);
    };

    downloadNext();
  });

  addEntryBtn.addEventListener('click', () => {
    const entry = createEntry();
    entries.push(entry);
    currentEntryId = entry.id;
    saveEntries();
    renderEntryList();
    applyEntryToFields(entry);
    hidePreviewAndScrollToFields();
  });

  duplicateEntryBtn.addEventListener('click', () => {
    const current = getCurrentEntry();
    if(!current) return;
    const clone = createEntry({
      p1_name: current.p1_name,
      p1_parents: current.p1_parents,
      p1_address: current.p1_address,
      p2_name: current.p2_name,
      p2_parents: current.p2_parents,
      p2_address: current.p2_address,
      marriage_date: current.marriage_date,
      registration_number: current.registration_number
    });
    entries.push(clone);
    currentEntryId = clone.id;
    saveEntries();
    renderEntryList();
    applyEntryToFields(clone);
    hidePreviewAndScrollToFields();
  });

  deleteEntryBtn.addEventListener('click', () => {
    const current = getCurrentEntry();
    if(!current) return;
    if(!deleteDialog) {
      entries = entries.filter(entry => entry.id !== current.id);
      saveEntries();
      ensureEntrySelection();
      renderEntryList();
      applyEntryToFields(getCurrentEntry());
      return;
    }
    deleteDialog.showModal();
  });

  if(deleteDialog) {
    deleteDialog.addEventListener('close', () => {
      if(deleteDialog.returnValue !== 'confirm') return;
      const current = getCurrentEntry();
      if(!current) return;
      entries = entries.filter(entry => entry.id !== current.id);
      saveEntries();
      ensureEntrySelection();
      renderEntryList();
      applyEntryToFields(getCurrentEntry());
    });
  }

  togglePreviewBtn.addEventListener('click', () => {
    const isHidden = canvas.classList.contains('preview-hidden');
    setPreviewVisible(isHidden);
  });

  ensureEntrySelection();
  renderEntryList();
  applyEntryToFields(getCurrentEntry());
  syncInspector();
})();
