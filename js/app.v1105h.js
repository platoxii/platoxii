
    const STORAGE_KEY = 'siteqc_clean_defects_v6';
    const META_STORAGE_KEY = 'siteqc_project_meta_v6';
    const SUPABASE_URL = 'https://tljmegatizbjyprqwkvr.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_vNzeFQYuvs5JMQraW5Yv2Q_J4RhhND_';
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentProjectName = 'A棟新建工程 (宏昇營造)';
    let currentInspectorName = '陳工程師';
    let currentCaptureTimeStr = '2026-10-22 10:12';

    // Draft signature state for Step 4 preview card
    let draftSignatures = {
      inspector: { signed: true, name: '陳工程師', time: '2026-10-22 10:13', img: '' },
      vendor: { signed: false, name: '宏昇水電工程', time: '', img: '' },
      manager: { signed: false, name: '工地主任 / 所長', time: '', img: '' },
      reportCode: 'DEF-20261021-006'
    };

    let activeSigRole = 'inspector';
    let activeSigTicketId = null;
    let isSigPadDrawing = false;
    let sigPadStrokes = [];
    let currentSigStroke = [];
    let currentAdminStatusFilter = 'ALL';
    let defects = [];
    let currentTrade = '泥作工程';
    let currentSeverity = '重大缺失';
    let currentDrawTool = 'circle';
    let currentDrawColor = '#ff1e42';
    let canvasMarks = [];
    let isLightMode = false;
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let currentPenPath = [];
    let basePhotoElement = null;
    let currentVendorTicketId = null;
    let lastVendorCanvasTicketId = null;
    let currentReviewTicketId = null;
    let adminDisplayMode = 'kanban';
    let pwaEditingTicketId = null;
    let currentPwaCard = 1;
    let currentVendorCard = 1;
    let currentAdminCardIndex = 0;
    let vendorAfterPhotoElement = null;
    let vendorAfterMarks = [];
    let vendorDrawTool = 'circle';
    let vendorDrawColor = '#ff1e42';
    let isVendorDrawing = false;
    let vendorStartX = 0;
    let vendorStartY = 0;
    let vendorPenPath = [];

    function getImgSrc(id) {
      const el = document.getElementById(id);
      return el ? el.getAttribute('src') : '';
    }

    function saveDefectsToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defects));
      } catch (e) {}
    }

    function generateStylizedSignatureDataUrl(nameText, withRedStamp) {
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 100;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);

      // Handwritten cursive-style stroke + name
      ctx.save();
      ctx.strokeStyle = '#1e293b';
      ctx.fillStyle = '#0f172a';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw handwritten name slightly slanted
      ctx.translate(28, 56);
      ctx.rotate(-0.04);
      ctx.font = 'italic bold 24px "Noto Sans TC", "Inter", serif';
      ctx.fillText(nameText || '陳工程師', 18, 0);

      // Draw characteristic signature flourish wave across/underneath (matching reference screenshot)
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(35, -12, 68, 12, 105, -6);
      ctx.bezierCurveTo(132, -18, 155, 8, 188, 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(6, 16);
      ctx.quadraticCurveTo(95, 10, 192, 15);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();

      if (withRedStamp !== false) {
        drawRedElectronicStampOnCtx(ctx, 212, 18, 54, 54);
      }
      return c.toDataURL('image/png');
    }

    function drawRedElectronicStampOnCtx(ctx, x, y, w, h) {
      ctx.save();
      ctx.strokeStyle = '#be123c';
      ctx.fillStyle = 'rgba(255, 241, 242, 0.88)';
      ctx.lineWidth = 2.2;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
      ctx.fillStyle = '#9f1239';
      ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('電子', x + w / 2, y + 23);
      ctx.fillText('簽認', x + w / 2, y + 42);
      ctx.restore();
    }

    function generateDefaultInspectionPhotoDataUrl() {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 420;
      const ctx = c.getContext('2d');
      // Realistic dark electrical panel inspection background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#334155';
      ctx.fillRect(90, 35, 420, 340);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(120, 60, 360, 290);
      // Breakers & exposed wires illustration
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(150 + i * 62, 100, 44, 75);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(162 + i * 62, 128, 20, 16);
      }
      // Red defect circle around exposed busbar area
      ctx.strokeStyle = '#ff1e42';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(300, 245, 115, 62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
      ctx.fillText('⚠️ 活線裸露未設防護內蓋', 205, 330);
      return c.toDataURL('image/jpeg', 0.82);
    }

    function setCloudSyncBadge(mode, extra) {
      const el = document.getElementById('cloud-sync-badge');
      if (!el) return;
      if (mode === 'loading') {
        el.textContent = '雲端載入中';
        el.className = 'px-1.5 py-0.2 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0';
      } else if (mode === 'cloud') {
        el.textContent = extra ? ('雲端 ' + extra + ' 筆 · PIC') : '已同步雲端 · PIC';
        el.className = 'px-1.5 py-0.2 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0';
      } else {
        el.textContent = '離線（本機備援）';
        el.className = 'px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0';
      }
    }

    function initProjectMeta() {
      try {
        const metaRaw = localStorage.getItem(META_STORAGE_KEY);
        if (metaRaw) {
          const meta = JSON.parse(metaRaw);
          if (meta.projectName) currentProjectName = meta.projectName;
          if (meta.inspectorName) currentInspectorName = meta.inspectorName;
        }
      } catch (e) {}

      draftSignatures.inspector.name = currentInspectorName;
      draftSignatures.inspector.img = generateStylizedSignatureDataUrl(currentInspectorName, true);
      syncProjectAndInspectorUI();
    }

    function loadLocalDefectsCache() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            defects = parsed;
            currentVendorTicketId = defects.length ? defects[0].id : null;
            return true;
          }
        }
      } catch (e) {}
      defects = [];
      currentVendorTicketId = null;
      return false;
    }

    function initSeedData() {
      initProjectMeta();
      defects = [];
      currentVendorTicketId = null;
    }

    function refreshDefectsUi() {
      populateVendorDropdown();
      updateLiveLinePreviewText();
      renderStep4TriSignatureGrid();
      renderAdminBoard();
      if (defects.length > 0 && defects[0].beforeImg) {
        const lineImg = document.getElementById('line-card-img');
        if (lineImg) lineImg.src = defects[0].beforeImg;
      }
    }

    function syncProjectAndInspectorUI() {
      const pInput = document.getElementById('project-name-input');
      const iInput = document.getElementById('inspector-name-input');
      if (pInput && pInput.value !== currentProjectName) pInput.value = currentProjectName;
      if (iInput && iInput.value !== currentInspectorName) iInput.value = currentInspectorName;

      const hp = document.getElementById('header-project-display');
      const hi = document.getElementById('header-inspector-display');
      const ai = document.getElementById('admin-inspector-label');
      if (hp) hp.textContent = currentProjectName;
      if (hi) hi.textContent = currentInspectorName;
      if (ai) ai.textContent = currentInspectorName;
    }

    function updateProjectAndInspector() {
      const pInput = document.getElementById('project-name-input');
      const iInput = document.getElementById('inspector-name-input');
      if (pInput && pInput.value.trim()) {
        currentProjectName = pInput.value.trim();
      }
      if (iInput && iInput.value.trim()) {
        currentInspectorName = iInput.value.trim();
      }
      try {
        localStorage.setItem(META_STORAGE_KEY, JSON.stringify({
          projectName: currentProjectName,
          inspectorName: currentInspectorName
        }));
      } catch (e) {}

      draftSignatures.inspector.name = currentInspectorName;
      draftSignatures.inspector.img = generateStylizedSignatureDataUrl(currentInspectorName, true);
      if (defects.length > 0 && defects[0].signInspector) {
        defects[0].projectName = currentProjectName;
        defects[0].inspectorName = currentInspectorName;
        defects[0].signInspectorName = currentInspectorName;
        defects[0].signInspectorImg = draftSignatures.inspector.img;
        saveDefectsToStorage();
      }
      syncProjectAndInspectorUI();
      redrawCanvas();
      updateLiveLinePreviewText();
      renderStep4TriSignatureGrid();
      renderAdminBoard();

      const badge = document.getElementById('project-saved-badge');
      if (badge) {
        badge.textContent = '✅ 已更新專案與查驗人！';
      }
      showToast(`✅ 已更新專案為「${currentProjectName}」｜查驗人員：${currentInspectorName}`, 'success');
    }

    function openAdminWithStatusFilter(statusKey) {
      currentAdminStatusFilter = statusKey;
      currentAdminCardIndex = 0;
      switchMainTab('admin');
      setAdminStatusFilter(statusKey);
    }

    function setAdminStatusFilter(statusKey) {
      currentAdminStatusFilter = statusKey;
      currentAdminCardIndex = 0;
      ['ALL', 'OPEN', 'PENDING_REVIEW', 'CLOSED'].forEach(k => {
        const btn = document.getElementById('adm-st-' + k);
        if (!btn) return;
        if (k === statusKey) {
          btn.className = 'py-1 px-1 rounded-lg font-bold bg-amber-500 text-slate-950 transition shadow';
        } else {
          btn.className = 'py-1 px-1 rounded-lg font-medium bg-slate-900 text-slate-300 border border-slate-800 transition';
        }
      });
      renderAdminBoard();
    }

    // Compress any uploaded image so mobile camera photos never exceed localStorage limits
    function compressUploadedImage(dataUrl, maxW, maxH, quality, callback) {
      const img = new Image();
      img.onload = function() {
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const ctx = offCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        callback(offCanvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    }

    // ====================================================
    // 1. Clean Photo Canvas (Tap to upload, drag to mark)
    // ====================================================
    function initCanvas() {
      const canvas = document.getElementById('defect-canvas');
      if (!canvas) return;

      basePhotoElement = null;
      canvasMarks = [];
      redrawCanvas();

      function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      }

      function startDraw(e) {
        if (!basePhotoElement) {
          const fileInput = document.getElementById('pwa-photo-upload');
          if (fileInput) fileInput.click();
          return;
        }
        e.preventDefault();
        isDrawing = true;
        const pos = getCanvasCoords(e);
        startX = pos.x;
        startY = pos.y;
        if (currentDrawTool === 'pen') {
          currentPenPath = [{ x: pos.x, y: pos.y }];
        }
      }

      function moveDraw(e) {
        if (!isDrawing || !basePhotoElement) return;
        e.preventDefault();
        const pos = getCanvasCoords(e);
        redrawCanvas();
        const ctx = canvas.getContext('2d');
        if (currentDrawTool === 'circle') {
          drawCircleMark(ctx, startX, startY, pos.x, pos.y, currentDrawColor);
        } else if (currentDrawTool === 'arrow') {
          drawArrowMark(ctx, startX, startY, pos.x, pos.y, currentDrawColor);
        } else if (currentDrawTool === 'pen') {
          currentPenPath.push({ x: pos.x, y: pos.y });
          drawPenMark(ctx, currentPenPath, currentDrawColor);
        }
      }

      function endDraw(e) {
        if (!isDrawing || !basePhotoElement) return;
        isDrawing = false;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const changed = e.changedTouches ? e.changedTouches[0] : e;
        const endX = (changed.clientX - rect.left) * scaleX;
        const endY = (changed.clientY - rect.top) * scaleY;

        if (currentDrawTool === 'pen' && currentPenPath.length > 1) {
          canvasMarks.push({ type: 'pen', points: currentPenPath.slice(), color: currentDrawColor });
        } else {
          const dist = Math.hypot(endX - startX, endY - startY);
          if (dist < 15) {
            canvasMarks.push({
              type: 'circle',
              x1: endX - 60,
              y1: endY - 60,
              x2: endX + 60,
              y2: endY + 60,
              color: currentDrawColor
            });
          } else {
            canvasMarks.push({
              type: currentDrawTool,
              x1: startX,
              y1: startY,
              x2: endX,
              y2: endY,
              color: currentDrawColor
            });
          }
        }
        redrawCanvas();
        syncAnnotatedPreviewToLineCard();
      }

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', moveDraw);
      window.addEventListener('mouseup', endDraw);
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', moveDraw, { passive: false });
      canvas.addEventListener('touchend', endDraw);
    }

    function drawCircleMark(ctx, x1, y1, x2, y2, color) {
      const strokeColor = color || '#ff1e42';
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.max(Math.abs(x2 - x1) / 2, 18);
      const ry = Math.max(Math.abs(y2 - y1) / 2, 18);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 5;
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
    }

    function drawArrowMark(ctx, x1, y1, x2, y2, color) {
      const strokeColor = color || '#ff1e42';
      const headLen = 18;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawPenMark(ctx, points, color) {
      const strokeColor = color || '#ff1e42';
      if (!points || points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function redrawCanvas() {
      const canvas = document.getElementById('defect-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (basePhotoElement && basePhotoElement.complete) {
        ctx.drawImage(basePhotoElement, 0, 0, canvas.width, canvas.height);

        const todayStr = new Date().toISOString().slice(0, 10);
        const overlayX = 28;
        const overlayY = 28;
        const overlayH = 34;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.fillRect(overlayX, overlayY, Math.min(520, canvas.width - overlayX * 2), overlayH);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 13px Inter, Noto Sans TC, sans-serif';
        ctx.fillText('📍 ' + currentProjectName.slice(0, 14) + ' ｜ 查驗:' + currentInspectorName + ' ｜ ' + todayStr, overlayX + 12, overlayY + 23);

        canvasMarks.forEach(m => {
          if (m.type === 'circle') drawCircleMark(ctx, m.x1, m.y1, m.x2, m.y2, m.color);
          else if (m.type === 'arrow') drawArrowMark(ctx, m.x1, m.y1, m.x2, m.y2, m.color);
          else if (m.type === 'pen') drawPenMark(ctx, m.points, m.color);
        });
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
        ctx.setLineDash([]);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 22px Inter, Noto Sans TC, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📷 點此拍照 / 選取工地照片', canvas.width / 2, canvas.height / 2 - 12);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, Noto Sans TC, sans-serif';
        ctx.fillText('上傳照片後，直接用手指拖曳即可畫紅圈標示缺失', canvas.width / 2, canvas.height / 2 + 22);
        ctx.textAlign = 'start';
      }

      const countEl = document.getElementById('canvas-mark-count');
      if (countEl) {
        countEl.textContent = '已標記 ' + canvasMarks.length + ' 處';
      }
    }

    function setDrawTool(tool) {
      currentDrawTool = tool;
      ['circle', 'arrow', 'pen'].forEach(t => {
        const btn = document.getElementById('tool-' + t);
        if (!btn) return;
        if (t === tool) {
          btn.className = 'px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-600 text-white shadow';
        } else {
          btn.className = 'px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800';
        }
      });
    }

    function undoCanvasMark() {
      canvasMarks.pop();
      redrawCanvas();
      syncAnnotatedPreviewToLineCard();
    }

    function clearCanvasMarks() {
      canvasMarks = [];
      redrawCanvas();
      syncAnnotatedPreviewToLineCard();
      showToast('已清除照片上的標記', 'info');
    }

    function syncAnnotatedPreviewToLineCard() {
      const canvas = document.getElementById('defect-canvas');
      const lineImg = document.getElementById('line-card-img');
      if (canvas && lineImg) {
        try {
          lineImg.src = canvas.toDataURL('image/jpeg', 0.78);
        } catch (err) {}
      }
    }

    function getVendorAfterCanvasCoords(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    function initVendorAfterCanvas() {
      const canvas = document.getElementById('vendor-after-canvas');
      if (!canvas || canvas.dataset.bound === '1') return;
      canvas.dataset.bound = '1';

      function startDraw(e) {
        if (!vendorAfterPhotoElement) {
          const fileInput = document.getElementById('vendor-after-file-input');
          if (fileInput) fileInput.click();
          return;
        }
        e.preventDefault();
        isVendorDrawing = true;
        const pos = getVendorAfterCanvasCoords(e, canvas);
        vendorStartX = pos.x;
        vendorStartY = pos.y;
        if (vendorDrawTool === 'pen') vendorPenPath = [{ x: pos.x, y: pos.y }];
      }

      function moveDraw(e) {
        if (!isVendorDrawing || !vendorAfterPhotoElement) return;
        e.preventDefault();
        const pos = getVendorAfterCanvasCoords(e, canvas);
        redrawVendorAfterCanvas();
        const ctx = canvas.getContext('2d');
        if (vendorDrawTool === 'circle') drawCircleMark(ctx, vendorStartX, vendorStartY, pos.x, pos.y, vendorDrawColor);
        else if (vendorDrawTool === 'arrow') drawArrowMark(ctx, vendorStartX, vendorStartY, pos.x, pos.y, vendorDrawColor);
        else if (vendorDrawTool === 'pen') {
          vendorPenPath.push({ x: pos.x, y: pos.y });
          drawPenMark(ctx, vendorPenPath, vendorDrawColor);
        }
      }

      function endDraw(e) {
        if (!isVendorDrawing || !vendorAfterPhotoElement) return;
        isVendorDrawing = false;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const changed = e.changedTouches ? e.changedTouches[0] : e;
        const endX = (changed.clientX - rect.left) * scaleX;
        const endY = (changed.clientY - rect.top) * scaleY;
        if (vendorDrawTool === 'pen' && vendorPenPath.length > 1) {
          vendorAfterMarks.push({ type: 'pen', points: vendorPenPath.slice(), color: vendorDrawColor });
        } else {
          const dist = Math.hypot(endX - vendorStartX, endY - vendorStartY);
          if (dist < 15) {
            vendorAfterMarks.push({ type: 'circle', x1: endX - 60, y1: endY - 60, x2: endX + 60, y2: endY + 60, color: vendorDrawColor });
          } else {
            vendorAfterMarks.push({ type: vendorDrawTool, x1: vendorStartX, y1: vendorStartY, x2: endX, y2: endY, color: vendorDrawColor });
          }
        }
        redrawVendorAfterCanvas();
      }

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', moveDraw);
      window.addEventListener('mouseup', endDraw);
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', moveDraw, { passive: false });
      canvas.addEventListener('touchend', endDraw);
      redrawVendorAfterCanvas();
    }

    function redrawVendorAfterCanvas() {
      const canvas = document.getElementById('vendor-after-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (vendorAfterPhotoElement && vendorAfterPhotoElement.complete) {
        ctx.drawImage(vendorAfterPhotoElement, 0, 0, canvas.width, canvas.height);
        vendorAfterMarks.forEach(m => {
          if (m.type === 'circle') drawCircleMark(ctx, m.x1, m.y1, m.x2, m.y2, m.color);
          else if (m.type === 'arrow') drawArrowMark(ctx, m.x1, m.y1, m.x2, m.y2, m.color);
          else if (m.type === 'pen') drawPenMark(ctx, m.points, m.color);
        });
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
        ctx.setLineDash([]);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 20px Inter, Noto Sans TC, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📷 點此拍完工照 / 選圖', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, Noto Sans TC, sans-serif';
        ctx.fillText('上傳後可畫紅圈、箭頭標示修繕位置', canvas.width / 2, canvas.height / 2 + 20);
        ctx.textAlign = 'start';
      }
    }

    function setVendorDrawTool(tool) {
      vendorDrawTool = tool;
      ['circle', 'arrow', 'pen'].forEach(t => {
        const btn = document.getElementById('vtool-' + t);
        if (!btn) return;
        btn.className = t === tool
          ? 'px-2 py-1 rounded-lg text-[11px] font-medium bg-rose-600 text-white shadow'
          : 'px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:bg-slate-800';
      });
    }

    function undoVendorAfterMark() {
      vendorAfterMarks.pop();
      redrawVendorAfterCanvas();
    }

    function clearVendorAfterMarks() {
      vendorAfterMarks = [];
      redrawVendorAfterCanvas();
    }

    function handlePwaPhotoUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        compressUploadedImage(e.target.result, 800, 600, 0.78, function(compressedUrl) {
          basePhotoElement = new Image();
          basePhotoElement.onload = function() {
            canvasMarks = [];
            redrawCanvas();
            syncAnnotatedPreviewToLineCard();
            showToast('📷 照片已載入！請直接在照片上拖曳畫紅圈標記', 'success');
            updatePwaPhotoUi();
          };
          basePhotoElement.src = compressedUrl;
        });
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }

    function updatePwaPhotoUi() {
      const has = !!basePhotoElement;
      const pickText = document.getElementById('pwa-photo-pick-text');
      const retakeBtn = document.getElementById('pwa-canvas-retake-btn');
      const hint = document.getElementById('canvas-guide-hint');
      const banner = document.getElementById('pwa-retake-banner');
      const submitText = document.getElementById('pwa-submit-btn-text');
      const submitHint = document.getElementById('pwa-submit-hint');
      if (pickText) pickText.textContent = has ? '📷 重拍' : '📷 拍照 / 選照片';
      if (retakeBtn) {
        if (has) retakeBtn.classList.remove('hidden');
        else retakeBtn.classList.add('hidden');
      }
      if (hint) {
        hint.textContent = has ? '拖曳畫紅圈；拍不好按右上角「重拍」' : '👆 點擊畫布拍照，拖曳即可畫紅圈';
      }
      if (banner) {
        if (pwaEditingTicketId) {
          banner.classList.remove('hidden');
          banner.textContent = '單號不變 ' + pwaEditingTicketId + '：重拍後按派單，會覆蓋雲端 PIC 與派工單';
        } else {
          banner.classList.add('hidden');
        }
      }
      if (submitText) {
        submitText.textContent = pwaEditingTicketId
          ? ('☁️ 覆蓋雲端（同一編號 ' + pwaEditingTicketId + '）')
          : '🚀 確認派單（上傳 PIC 現場圖 ＋ 表單）';
      }
      if (submitHint) {
        if (pwaEditingTicketId) submitHint.classList.remove('hidden');
        else submitHint.classList.add('hidden');
      }
    }

    function retakePwaPhoto() {
      const fileInput = document.getElementById('pwa-photo-upload');
      if (!fileInput) return;
      fileInput.value = '';
      fileInput.click();
    }

    function beginRetakeDispatchedPhoto() {
      const d = defects.find(function(x) { return x.id === currentVendorTicketId; }) || defects[0];
      if (!d) {
        showToast('尚無已派單據可重拍', 'error');
        return;
      }
      pwaEditingTicketId = d.id;
      updatePwaPhotoUi();
      goToPwaCard(1);
      showToast('單號不變：重拍後按派單，會覆蓋雲端 ' + d.id + '_PIC.jpg 與 _before.jpg', 'info');
    }

    function startNewBlankTicket() {
      pwaEditingTicketId = null;
      clearSampleForm();
      goToPwaCard(1);
    }

    function clearSampleForm() {
      pwaEditingTicketId = null;
      basePhotoElement = null;
      canvasMarks = [];
      ['pwa-building', 'pwa-floor', 'pwa-area', 'pwa-note', 'pwa-vendor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      redrawCanvas();
      updateLiveLinePreviewText();
      updatePwaPhotoUi();
      showToast('已切換為空白表單，請直接拍照登錄', 'info');
    }

    function clearAllSampleDefects() {
      defects = [];
      saveDefectsToStorage();
      currentAdminCardIndex = 0;
      renderAdminBoard();
      populateVendorDropdown();
      showToast('已清空所有紀錄', 'info');
    }

    function loadSamplePreset(type) {
      clearSampleForm();
    }

    // ====================================================
    // 2. Location, Voice & Trade Inputs
    // ====================================================
    function appendDefectTag(tagText) {
      const noteEl = document.getElementById('pwa-note');
      if (!noteEl) return;
      const cur = noteEl.value.trim();
      noteEl.value = cur ? (cur + '；' + tagText) : tagText;
      updateLiveLinePreviewText();
      showToast('已帶入：' + tagText, 'info');
    }

    function triggerVoiceInput() {
      const btnText = document.getElementById('voice-text');
      const noteEl = document.getElementById('pwa-note');
      if (!btnText || !noteEl) return;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'zh-TW';
          btnText.textContent = '請說話...';
          recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const cur = noteEl.value.trim();
            noteEl.value = cur ? (cur + ' ' + transcript) : transcript;
            btnText.textContent = '語音輸入';
            updateLiveLinePreviewText();
            showToast('🎙️ 語音輸入完成', 'success');
          };
          recognition.onerror = function() {
            btnText.textContent = '語音輸入';
            showToast('請使用手機鍵盤上的🎙️麥克風輸入，或點選下方常用詞彙', 'info');
          };
          recognition.onend = function() {
            btnText.textContent = '語音輸入';
          };
          recognition.start();
          return;
        } catch (err) {}
      }
      showToast('請使用手機鍵盤上的🎙️麥克風語音輸入，或點選上方詞彙', 'info');
      noteEl.focus();
    }

    function selectTrade(tradeName) {
      currentTrade = tradeName;
      document.querySelectorAll('.trade-btn').forEach(btn => {
        if (btn.getAttribute('data-trade') === tradeName) {
          btn.className = 'trade-btn px-2.5 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1 bg-amber-500/20 border-amber-500 text-amber-300';
        } else {
          btn.className = 'trade-btn px-2.5 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1 bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700';
        }
      });
      updateLiveLinePreviewText();
    }

    function setActionNoteTag(tagText) {
      const el = document.getElementById('pwa-action-note');
      if (!el) return;
      el.value = tagText;
      updateLiveLinePreviewText();
      showToast('🛠️ 已帶入改善要求：' + tagText, 'info');
    }

    function updateLiveLinePreviewText() {
      const b = (document.getElementById('pwa-building').value || '').trim() || 'A棟';
      const f = (document.getElementById('pwa-floor').value || '').trim() || '2F';
      const a = (document.getElementById('pwa-area').value || '').trim() || '';
      const note = (document.getElementById('pwa-note').value || '').trim() || '樓層分電箱活線裸露未設臨時防護面板與感電警示貼紙';
      const actionNoteEl = document.getElementById('pwa-action-note');
      const actionNote = (actionNoteEl ? actionNoteEl.value.trim() : '') || '請立即加裝絕緣防護內蓋並張貼「送電中勿動」警示標誌';
      const vendor = (document.getElementById('pwa-vendor').value || '').trim() || '宏昇水電工程';
      const slaDays = parseInt(document.getElementById('pwa-sla').value || '3', 10);

      const due = new Date();
      due.setDate(due.getDate() + slaDays);
      const dueStr = due.toISOString().slice(0, 10);

      const locShort = a ? `${b}-${f} (${a})` : `${b}-${f}`;
      const captionMain = `【現場查驗】${currentProjectName} ｜ ${locShort}`;
      const captionSub = `拍攝時間：${currentCaptureTimeStr} ｜ 查驗員：${currentInspectorName}`;

      const s1Main = document.getElementById('step1-photo-caption-title');
      const s1Sub = document.getElementById('step1-photo-caption-sub');
      if (s1Main) s1Main.textContent = captionMain;
      if (s1Sub) s1Sub.textContent = captionSub;

      const c4Main = document.getElementById('line-card-photo-caption-main');
      const c4Sub = document.getElementById('line-card-photo-caption-sub');
      if (c4Main) c4Main.textContent = captionMain;
      if (c4Sub) c4Sub.textContent = captionSub;

      document.getElementById('line-card-trade').textContent = currentTrade;
      document.getElementById('line-card-loc').textContent = `📍 ${b} ・ ${f} ${a}`;
      document.getElementById('line-card-note').textContent = note;
      const actDisplay = document.getElementById('line-card-action-note');
      if (actDisplay) actDisplay.textContent = actionNote;
      document.getElementById('line-card-vendor').textContent = vendor;
      document.getElementById('line-card-sla').textContent = `限期：${dueStr} 前`;

      draftSignatures.vendor.name = vendor;
      renderStep4TriSignatureGrid();
    }

    // ====================================================
    // 3. Submit Ticket & Share to LINE / System
    // ====================================================
    function wrapCanvasText(ctx, text, maxWidth) {
      const str = String(text || '');
      const lines = [];
      let line = '';
      for (const ch of str) {
        const next = line + ch;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = ch;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
      return lines.length ? lines : [''];
    }

    function loadCanvasImage(src) {
      return new Promise((resolve) => {
        if (!src) { resolve(null); return; }
        const img = new Image();
        let done = false;
        const finish = (value) => {
          if (done) return;
          done = true;
          resolve(value);
        };
        if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
        img.onload = () => finish(img);
        img.onerror = () => finish(null);
        setTimeout(() => finish(null), 4000);
        img.src = src;
      });
    }

    async function renderInspectionReportDataUrl(d, photoDataUrl, afterDataUrl) {
      const photo = await loadCanvasImage(photoDataUrl || d.beforeImg);
      const after = await loadCanvasImage(afterDataUrl || d.afterImg);
      const sigInsp = await loadCanvasImage(d.signInspectorImg);
      const sigVendor = await loadCanvasImage(d.signVendorImg);
      const sigManager = await loadCanvasImage(d.signManagerImg);
      const W = 900;
      const pad = 28;
      const inner = W - pad * 2;
      const photoH = Math.round(inner * 10 / 16);
      const noteLinesDummy = 4;
      const H = pad + 86 + 78 + photoH + 58 + 118 + 168 + 46 + pad;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      let y = pad;
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 16px "Noto Sans TC", Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('專案：' + (d.projectName || ''), pad, y + 16);
      ctx.fillStyle = '#e11d48';
      ctx.font = 'bold 15px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText('單號：#' + d.id, W - pad, y + 16);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Noto Sans TC", sans-serif';
      ctx.fillText('查驗人：' + (d.inspectorName || ''), W - pad, y + 36);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px "Noto Sans TC", Inter, sans-serif';
      ctx.fillText('工地缺失改善派工暨三方查驗結案單', pad, y + 58);
      y += 78;

      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad, y, inner, 64, 10); else ctx.rect(pad, y, inner, 64);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '14px "Noto Sans TC", sans-serif';
      const loc = `${d.building}・${d.floor}・${d.area}`;
      ctx.fillText('查驗位置：' + loc, pad + 14, y + 26);
      ctx.fillText('責任工種：' + (d.trade || ''), pad + inner / 2, y + 26);
      ctx.fillText('負責廠商：' + (d.vendor || ''), pad + 14, y + 50);
      ctx.fillStyle = '#be123c';
      ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
      ctx.fillText('改善期限：' + (d.dueDate || '') + ' 前', pad + inner / 2, y + 50);
      y += 78;

      ctx.fillStyle = '#18181b';
      ctx.fillRect(pad, y, inner, photoH + 56);
      function drawClippedPhoto(img, x, w) {
        if (!img) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(x, y, w, photoH);
          return;
        }
        const scale = Math.max(w / img.width, photoH / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, photoH);
        ctx.clip();
        ctx.drawImage(img, x + (w - dw) / 2, y + (photoH - dh) / 2, dw, dh);
        ctx.restore();
      }
      if (after) {
        const gap = 8;
        const half = (inner - gap) / 2;
        drawClippedPhoto(photo, pad, half);
        drawClippedPhoto(after, pad + half + gap, half);
        ctx.fillStyle = 'rgba(225, 29, 72, 0.92)';
        ctx.fillRect(pad, y, 92, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
        ctx.fillText('改善前', pad + 14, y + 18);
        ctx.fillStyle = 'rgba(5, 150, 105, 0.95)';
        ctx.fillRect(pad + half + gap, y, 92, 26);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('改善後', pad + half + gap + 14, y + 18);
      } else {
        drawClippedPhoto(photo, pad, inner);
      }
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`【現場查驗】${d.projectName || ''} ｜ ${d.building}-${d.floor}`, W / 2, y + photoH + 24);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px "Noto Sans TC", sans-serif';
      ctx.fillText(`拍攝時間：${d.createdAt || ''} ｜ 查驗員：${d.inspectorName || ''}`, W / 2, y + photoH + 46);
      ctx.textAlign = 'left';
      y += photoH + 68;

      const boxW = (inner - 12) / 2;
      const boxH = 110;
      ctx.fillStyle = '#fff1f2';
      ctx.strokeStyle = '#fecdd3';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad, y, boxW, boxH, 12); else ctx.rect(pad, y, boxW, boxH);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ecfdf5';
      ctx.strokeStyle = '#a7f3d0';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad + boxW + 12, y, boxW, boxH, 12); else ctx.rect(pad + boxW + 12, y, boxW, boxH);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#9f1239';
      ctx.fillText('現場缺失現況說明', pad + 12, y + 22);
      ctx.fillStyle = '#065f46';
      ctx.fillText('改善要求與預防措施', pad + boxW + 24, y + 22);
      ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#0f172a';
      wrapCanvasText(ctx, d.description, boxW - 24).slice(0, 4).forEach((line, i) => {
        ctx.fillText(line, pad + 12, y + 46 + i * 18);
      });
      wrapCanvasText(ctx, d.vendorNote || d.actionNote, boxW - 24).slice(0, 4).forEach((line, i) => {
        ctx.fillText(line, pad + boxW + 24, y + 46 + i * 18);
      });
      y += boxH + 14;

      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad, y, inner, 156, 14); else ctx.rect(pad, y, inner, 156);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
      ctx.fillText('三方簽章覆核', pad + 14, y + 22);
      const colW = (inner - 36) / 3;
      const boxes = [
        { title: '查驗工程師簽章', name: d.signInspectorName, time: d.signInspectorTime, img: sigInsp, signed: d.signInspector },
        { title: '協力廠商簽認', name: d.signVendorName, time: d.signVendorTime, img: sigVendor, signed: d.signVendor },
        { title: '工地主任／主管覆核', name: d.signManagerName, time: d.signManagerTime, img: sigManager, signed: d.signManager }
      ];
      boxes.forEach((box, i) => {
        const bx = pad + 12 + i * (colW + 6);
        const by = y + 34;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, colW, 96, 8); else ctx.rect(bx, by, colW, 96);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
        ctx.fillText(box.title, bx + 8, by + 18);
        if (box.img) ctx.drawImage(box.img, bx + 8, by + 24, colW - 16, 44);
        else {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px "Noto Sans TC", sans-serif';
          ctx.fillText(box.signed ? '已簽章' : '（待簽認）', bx + 8, by + 52);
        }
        ctx.fillStyle = '#64748b';
        ctx.font = '11px "Noto Sans TC", sans-serif';
        ctx.fillText((box.name || '') + (box.time ? '  ' + box.time : ''), bx + 8, by + 86);
      });
      y += 156;

      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Noto Sans TC", sans-serif';
      ctx.fillText('由「工地缺失改善管理系統」自動排版生成', pad, y + 22);
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px ui-monospace, monospace';
      ctx.fillText('產出編號：' + (d.reportCode || d.id), W - pad, y + 22);
      ctx.textAlign = 'left';
      return c.toDataURL('image/jpeg', 0.86);
    }

    async function captureDispatchSheetDataUrl() {
      const el = document.getElementById('dispatch-form-sheet');
      if (!el || typeof html2canvas !== 'function') return '';
      const canvas = await html2canvas(el, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: function(node) {
          return !!(node && node.closest && node.closest('[data-capture-ignore]'));
        }
      });
      return canvas.toDataURL('image/jpeg', 0.9);
    }

    async function captureFormSheetLikeBefore(photoDataUrl, actionText, captionKind) {
      const viewPwa = document.getElementById('view-pwa');
      const step4 = document.getElementById('pwa-step-4');
      const img = document.getElementById('line-card-img');
      const actionEl = document.getElementById('line-card-action-note');
      const capMain = document.getElementById('line-card-photo-caption-main');
      const bak = {
        view: viewPwa && !viewPwa.classList.contains('hidden'),
        step4: step4 && !step4.classList.contains('hidden'),
        img: img ? img.src : '',
        action: actionEl ? actionEl.textContent : '',
        cap: capMain ? capMain.textContent : ''
      };
      try {
        if (viewPwa) viewPwa.classList.remove('hidden');
        if (step4) step4.classList.remove('hidden');
        if (img && photoDataUrl) {
          img.src = photoDataUrl;
          if (img.decode) await img.decode().catch(function() {});
        }
        if (actionEl && actionText) actionEl.textContent = actionText;
        if (capMain && captionKind === 'after') {
          capMain.textContent = String(bak.cap || capMain.textContent).replace('現場查驗', '完工回報');
        }
        await new Promise(function(resolve) { setTimeout(resolve, 120); });
        return await captureDispatchSheetDataUrl();
      } finally {
        if (img) img.src = bak.img;
        if (actionEl) actionEl.textContent = bak.action;
        if (capMain) capMain.textContent = bak.cap;
        if (step4 && !bak.step4) step4.classList.add('hidden');
        if (viewPwa && !bak.view) viewPwa.classList.add('hidden');
      }
    }

    let allowReportJpgUpload = false;

    async function uploadDefectPhotoToSupabase(fileName, dataUrl) {
      if (!dataUrl) return '';
      if (/_report\.jpg$/i.test(String(fileName)) && !allowReportJpgUpload) {
        console.warn('已攔截開單階段的 _report.jpg 上傳：', fileName);
        return '';
      }
      const blobRes = await fetch(dataUrl);
      const blob = await blobRes.blob();
      const { error: uploadError } = await db.storage
        .from('defects')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicURLData } = db.storage.from('defects').getPublicUrl(fileName);
      const publicUrl = (publicURLData && publicURLData.publicUrl) || '';
      return publicUrl ? (publicUrl.split('?')[0] + '?t=' + Date.now()) : '';
    }

    function parseDefectLocation(loc) {
      const s = String(loc || '').trim();
      const m = s.match(/^(.+?)-(\S+)\s*(.*)$/);
      if (!m) return { building: s || 'A棟', floor: '', area: '' };
      return { building: m[1], floor: m[2], area: (m[3] || '').trim() };
    }

    function cloudBeforeUrl(row) {
      const sig = row && row.signatures && typeof row.signatures === 'object' ? row.signatures : {};
      if (sig.pic_url) return sig.pic_url;
      const a = row.before_img || '';
      const b = row.photo_before || '';
      if (/before_pic/i.test(a)) return a;
      if (/before_pic/i.test(b)) return b;
      return a || b;
    }

    function defectSitePhotoUrl(d) {
      if (!d) return '';
      const listed = [d.picImg, d.beforeImg];
      for (let i = 0; i < listed.length; i++) {
        if (listed[i] && /_PIC\.jpg/i.test(listed[i])) return listed[i];
      }
      if (d.id) {
        return SUPABASE_URL + '/storage/v1/object/public/defects/' + d.id + '_PIC.jpg';
      }
      return d.beforeImg || '';
    }

    function cloudAfterUrl(row) {
      const sig = row && row.signatures && typeof row.signatures === 'object' ? row.signatures : {};
      if (sig.after_pic_url) return sig.after_pic_url;
      const a = row.after_img || '';
      const b = row.photo_after || '';
      if (/after_PIC|_after_PIC/i.test(a)) return a;
      if (/after_PIC|_after_PIC/i.test(b)) return b;
      return a || b;
    }

    function defectAfterPhotoUrl(d) {
      if (!d) return '';
      const listed = [d.afterPicImg, d.afterImg];
      for (let i = 0; i < listed.length; i++) {
        if (listed[i] && /_PIC\.jpg/i.test(listed[i])) return listed[i];
      }
      if (d.id) {
        return SUPABASE_URL + '/storage/v1/object/public/defects/' + d.id + '_after_PIC.jpg';
      }
      return d.afterImg || '';
    }

    async function archiveClosedReport(d) {
      if (!d || !d.id) return '';
      const beforePic = defectSitePhotoUrl(d);
      const afterPic = defectAfterPhotoUrl(d);
      const reportDataUrl = await renderInspectionReportDataUrl(d, beforePic, afterPic);
      allowReportJpgUpload = true;
      let reportUrl = '';
      try {
        reportUrl = await uploadDefectPhotoToSupabase(`${d.id}_report.jpg`, reportDataUrl);
      } finally {
        allowReportJpgUpload = false;
      }
      d.reportImg = reportUrl || '';
      if (!d.signatures) d.signatures = {};
      d.signatures.report_url = d.reportImg || null;
      return reportUrl;
    }

    function mapCloudRowToDefect(row) {
      const loc = parseDefectLocation(row.location);
      const sig = row.signatures && typeof row.signatures === 'object' ? row.signatures : {};
      const created = row.created_at ? String(row.created_at).replace('T', ' ').slice(0, 16) : '';
      const due = row.due_date ? String(row.due_date).slice(0, 10) : '';
      return {
        id: row.id,
        reportCode: row.id,
        projectName: row.project_name || currentProjectName,
        inspectorName: row.inspector || currentInspectorName,
        building: loc.building,
        floor: loc.floor,
        area: loc.area,
        trade: row.trade || '',
        vendor: row.vendor || '',
        description: row.issue_desc || '',
        actionNote: row.solution_desc || '',
        beforeImg: sig.pic_url || cloudBeforeUrl(row) || '',
        picImg: sig.pic_url || '',
        formImg: sig.form_url || '',
        afterImg: cloudAfterUrl(row) || null,
        afterPicImg: sig.after_pic_url || '',
        reportImg: sig.report_url || '',
        vendorNote: '',
        auditNote: '',
        signVendor: !!(sig.vendor && sig.vendor.signed),
        signInspector: !!(sig.inspector && sig.inspector.signed),
        signManager: !!(sig.manager && sig.manager.signed),
        signInspectorName: (sig.inspector && sig.inspector.name) || row.inspector || currentInspectorName,
        signInspectorTime: (sig.inspector && sig.inspector.time) || '',
        signInspectorImg: (sig.inspector && sig.inspector.img) || '',
        signVendorName: (sig.vendor && sig.vendor.name) || row.vendor || '',
        signVendorTime: (sig.vendor && sig.vendor.time) || '',
        signVendorImg: (sig.vendor && sig.vendor.img) || '',
        signManagerName: (sig.manager && sig.manager.name) || '工地主任 / 所長',
        signManagerTime: (sig.manager && sig.manager.time) || '',
        signManagerImg: (sig.manager && sig.manager.img) || '',
        closedAt: row.status === 'CLOSED' ? created : '',
        status: row.status || 'OPEN',
        dueDate: due,
        createdAt: created,
        magicToken: 'tk_' + String(row.id || '').replace(/\D/g, '').slice(-3)
      };
    }

    function nextDefectId() {
      const dateCompact = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = 'DEF-' + dateCompact + '-';
      let max = 0;
      defects.forEach((d) => {
        const id = String(d.id || '');
        if (id.startsWith(prefix)) {
          const n = parseInt(id.slice(prefix.length), 10);
          if (!isNaN(n) && n > max) max = n;
        }
      });
      return prefix + String(max + 1).padStart(3, '0');
    }

    async function insertDefectToSupabase(d, publicPhotoUrl, publicReportUrl) {
      const base = {
        id: d.id,
        project_name: d.projectName,
        location: `${d.building}-${d.floor} ${d.area}`,
        trade: d.trade,
        vendor: d.vendor,
        issue_desc: d.description,
        solution_desc: d.actionNote,
        urgency: d.severity || currentSeverity,
        status: d.status || 'OPEN',
        inspector: d.inspectorName,
        due_date: d.dueDate || null,
        signatures: {
          inspector: { name: d.signInspectorName, time: d.signInspectorTime, signed: d.signInspector },
          vendor: { name: d.signVendorName, time: d.signVendorTime, signed: d.signVendor },
          manager: { name: d.signManagerName, time: d.signManagerTime, signed: d.signManager },
          report_url: null,
          form_url: d.formImg || publicReportUrl || null,
          pic_url: publicPhotoUrl || null
        }
      };
      const attempts = [
        { ...base, before_img: publicPhotoUrl || null, after_img: null, photo_before: publicPhotoUrl || null, photo_after: null },
        { ...base, before_img: publicPhotoUrl || null, after_img: null },
        { ...base, photo_before: publicPhotoUrl || null, photo_after: null }
      ];
      let lastErr = null;
      for (const row of attempts) {
        const { error } = await db.from('defects').insert([row]);
        if (!error) return;
        lastErr = error;
      }
      throw lastErr;
    }

    async function updateDefectOnSupabase(id, patch) {
      const merged = { ...patch };
      if (Object.prototype.hasOwnProperty.call(patch, 'after_img') && !Object.prototype.hasOwnProperty.call(patch, 'photo_after')) {
        merged.photo_after = patch.after_img;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'photo_after') && !Object.prototype.hasOwnProperty.call(patch, 'after_img')) {
        merged.after_img = patch.photo_after;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'before_img') && !Object.prototype.hasOwnProperty.call(patch, 'photo_before')) {
        merged.photo_before = patch.before_img;
      }
      let { error } = await db.from('defects').update(merged).eq('id', id);
      if (error) {
        const slim = { ...patch };
        ({ error } = await db.from('defects').update(slim).eq('id', id));
      }
      if (error) throw error;
    }

    async function loadDefectsFromSupabase() {
      const { data, error } = await db.from('defects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (!Array.isArray(data)) return false;
      defects = data.map(mapCloudRowToDefect);
      saveDefectsToStorage();
      if (!defects.find(d => d.id === currentVendorTicketId)) {
        currentVendorTicketId = defects.length ? defects[0].id : null;
      }
      lastVendorCanvasTicketId = null;
      return true;
    }

    function refreshFromCloud(silent) {
      setCloudSyncBadge('loading');
      return loadDefectsFromSupabase().then(() => {
        refreshDefectsUi();
        setCloudSyncBadge('cloud', defects.length);
        if (!silent) showToast('☁️ 已重新同步雲端 ' + defects.length + ' 筆', 'success');
      }).catch((err) => {
        console.error(err);
        setCloudSyncBadge('offline');
        if (!silent) showToast('⚠️ 雲端同步失敗：' + (err.message || err), 'error');
      });
    }

    async function submitPwaDefect() {
      const canvas = document.getElementById('defect-canvas');
      if (!basePhotoElement || !canvas) {
        showToast('請先在 Step 1 拍照並標記缺失', 'error');
        goToPwaCard(1);
        return;
      }
      const annotatedDataUrl = canvas.toDataURL('image/jpeg', 0.78);

      const b = (document.getElementById('pwa-building').value || '').trim() || 'A棟';
      const f = (document.getElementById('pwa-floor').value || '').trim() || '2F';
      const a = (document.getElementById('pwa-area').value || '').trim() || '現場查驗區';
      const note = (document.getElementById('pwa-note').value || '').trim() || '樓層分電箱活線裸露未設臨時防護面板與感電警示貼紙';
      const actEl = document.getElementById('pwa-action-note');
      const actionNote = (actEl ? actEl.value.trim() : '') || '請立即加裝絕緣防護內蓋並張貼「送電中勿動」警示標誌';
      const vendor = (document.getElementById('pwa-vendor').value || '').trim() || '宏昇水電工程';
      const slaDays = parseInt(document.getElementById('pwa-sla').value || '3', 10);

      const due = new Date();
      due.setDate(due.getDate() + slaDays);
      const dueStr = due.toISOString().slice(0, 10);

      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      currentCaptureTimeStr = nowStr;
      const editing = pwaEditingTicketId ? defects.find(function(x) { return x.id === pwaEditingTicketId; }) : null;
      const newId = editing ? editing.id : nextDefectId();
      const token = (editing && editing.magicToken) ? editing.magicToken : ('tk_' + newId.replace(/\D/g, '').slice(-3));

      draftSignatures.reportCode = newId;
      draftSignatures.inspector.name = currentInspectorName;
      draftSignatures.inspector.time = nowStr;
      if (!draftSignatures.inspector.img) {
        draftSignatures.inspector.img = generateStylizedSignatureDataUrl(currentInspectorName, true);
      }
      draftSignatures.vendor.name = vendor;

      const newDefect = editing || {
        id: newId,
        reportCode: newId,
        afterImg: null,
        vendorNote: '',
        auditNote: '',
        closedAt: '',
        status: 'OPEN',
        createdAt: nowStr
      };
      newDefect.id = newId;
      newDefect.reportCode = newId;
      newDefect.projectName = currentProjectName;
      newDefect.inspectorName = currentInspectorName;
      newDefect.building = b;
      newDefect.floor = f;
      newDefect.area = a;
      newDefect.trade = currentTrade;
      newDefect.vendor = vendor;
      newDefect.description = note;
      newDefect.actionNote = actionNote;
      newDefect.beforeImg = annotatedDataUrl;
      newDefect.signVendor = draftSignatures.vendor.signed;
      newDefect.signInspector = true;
      newDefect.signManager = draftSignatures.manager.signed;
      newDefect.signInspectorName = currentInspectorName;
      newDefect.signInspectorTime = nowStr;
      newDefect.signInspectorImg = draftSignatures.inspector.img;
      newDefect.signVendorName = vendor;
      newDefect.signVendorTime = draftSignatures.vendor.time || '';
      newDefect.signVendorImg = draftSignatures.vendor.img || '';
      newDefect.signManagerName = draftSignatures.manager.name || '工地主任 / 所長';
      newDefect.signManagerTime = draftSignatures.manager.time || '';
      newDefect.signManagerImg = draftSignatures.manager.img || '';
      newDefect.dueDate = dueStr;
      newDefect.magicToken = token;

      document.getElementById('line-card-id').textContent = '#' + newId;
      document.getElementById('line-card-img').src = annotatedDataUrl;
      document.getElementById('line-card-url').textContent = `🔗 #/vendor/${token}`;
      document.getElementById('line-sim-timestamp').textContent = editing
        ? ('✅ 已覆蓋雲端照片 #' + newId)
        : ('✅ 已建立派單 #' + newId);
      const reportCodeEl = document.getElementById('line-card-report-code');
      if (reportCodeEl) reportCodeEl.textContent = '產出編號：' + newId;
      updateLiveLinePreviewText();
      goToPwaCard(4);
      try {
        const previewImg = document.getElementById('line-card-img');
        if (previewImg && previewImg.decode) await previewImg.decode();
      } catch (err) {}
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      let publicPicUrl = '';
      let publicFormUrl = '';
      try {
        publicPicUrl = await uploadDefectPhotoToSupabase(`${newId}_PIC.jpg`, annotatedDataUrl);
        newDefect.beforeImg = publicPicUrl || annotatedDataUrl;
        newDefect.picImg = publicPicUrl || '';
        if (!publicPicUrl) throw new Error('PIC 網址是空的');
        showToast((editing ? '☁️ 已覆蓋現場圖：' : '☁️ 現場圖已上傳：') + newId + '_PIC.jpg', 'success');
      } catch (err) {
        console.error(err);
        showToast('⚠️ 現場圖 _PIC.jpg 未上傳：' + (err.message || err), 'error');
      }
      try {
        let formDataUrl = await captureDispatchSheetDataUrl();
        if (!formDataUrl) {
          formDataUrl = await renderInspectionReportDataUrl(newDefect, annotatedDataUrl);
        }
        publicFormUrl = await uploadDefectPhotoToSupabase(`${newId}_before.jpg`, formDataUrl);
        newDefect.formImg = publicFormUrl || '';
        if (!editing) newDefect.reportImg = '';
      } catch (err) {
        console.error(err);
        showToast('⚠️ 派工單 _before 未上傳：' + (err.message || err), 'error');
      }

      if (!editing) defects.unshift(newDefect);
      saveDefectsToStorage();
      currentVendorTicketId = newId;

      try {
        if (editing) {
          const sig = Object.assign({}, newDefect.signatures || {});
          sig.form_url = publicFormUrl || newDefect.formImg || null;
          sig.pic_url = publicPicUrl || null;
          sig.report_url = newDefect.reportImg || null;
          sig.inspector = { name: newDefect.signInspectorName, time: newDefect.signInspectorTime, signed: newDefect.signInspector };
          await updateDefectOnSupabase(newId, {
            location: newDefect.building + '-' + newDefect.floor + ' ' + newDefect.area,
            trade: newDefect.trade,
            vendor: newDefect.vendor,
            issue_desc: newDefect.description,
            solution_desc: newDefect.actionNote,
            inspector: newDefect.inspectorName,
            due_date: newDefect.dueDate || null,
            photo_before: publicPicUrl || null,
            before_img: publicPicUrl || null,
            signatures: sig
          });
          showToast('☁️ 已覆蓋 ' + newId + '_PIC.jpg 與 _before.jpg（單號不變）', 'success');
        } else {
          await insertDefectToSupabase(newDefect, publicPicUrl, publicFormUrl);
          showToast('☁️ 已寫入 ' + newId + '_PIC.jpg（現場圖）與 _before.jpg（表單）', 'success');
        }
      } catch (err) {
        console.error('Supabase 資料表寫入失敗：', err);
        showToast('⚠️ 資料表沒寫入：' + (err.message || err), 'error');
      }

      populateVendorDropdown();
      renderAdminBoard();
      pwaEditingTicketId = null;
      updatePwaPhotoUi();

      goToPwaCard(4);
      showToast(editing ? ('🔄 已覆蓋雲端照片 (#' + newId + ')') : ('🚀 派單完成 (#' + newId + ')！'), 'success');
    }

    function shareToLineOrSystem() {
      const idText = document.getElementById('line-card-id').textContent;
      const locText = document.getElementById('line-card-loc').textContent;
      const noteText = document.getElementById('line-card-note').textContent;
      const slaText = document.getElementById('line-card-sla').textContent;
      const vendorText = document.getElementById('line-card-vendor').textContent;
      const shareText = `🚨【工地缺失改善派單 ${idText}】\n${locText}\n負責廠商：${vendorText}\n說明：${noteText}\n${slaText}`;

      openLineFriendPicker(shareText);
    }

    async function pushDefectToLineGroup() {
      const d = defects.find(x => x.id === currentVendorTicketId) || defects[0];
      if (!d) { showToast('⚠️ 尚無缺失單，請先派單', 'error'); return; }
      const btn = document.getElementById('line-push-btn');
      if (btn) btn.disabled = true;
      try {
        const src = defectPhotoSrc(d);
        let photo = src.startsWith('/api/photos/') ? src : (src.startsWith(location.origin + '/api/photos/') ? src.slice(location.origin.length) : '');
        let photoData = '';
        let photoErr = '';
        if (!photo && src) {
          let blob = null;
          try {
            showToast('📤 正在補傳照片到雲端…', 'info');
            blob = await dataUrlToJpegBlob(src);
            const date = String(d.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
            photo = await uploadPhotoToR2(blob, d.projectName || currentProjectName, date, d.id + '.jpg');
            d.photoUrl = photo; d.beforeImg = photo;
            saveDefectsToStorage();
          } catch (e) {
            photoErr = e.message || String(e); photo = '';
            // 最後手段：把壓縮後的照片直接交給推播 API，由伺服器存 R2
            try { if (blob) photoData = await blobToDataUrl(blob); } catch (_) {}
          }
        } else if (!src) photoErr = '這張缺失單找不到照片';
        const res = await fetch('/api/line-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: d.id, site: d.projectName, building: d.building, floor: d.floor, area: d.area,
            trade: d.trade, severity: d.severity, vendor: d.vendor, description: d.description,
            action_note: d.actionNote, due_date: d.dueDate, inspector: d.inspectorName,
            photo_url: photo, photo_data: photoData, link: d.magicToken ? '#/vendor/' + d.magicToken : ''
          })
        });
        const r = await res.json().catch(() => ({}));
        if (res.ok && r.ok) {
          const ps = r.photo || {};
          if (ps.status === 'attached') showToast(`✅ 已推播到 LINE 群組 (#${d.id})（含照片）`, 'success');
          else showToast(`⚠️ 已推播文字 (#${d.id})，但沒附照片：${ps.reason || photoErr || '未知原因'}${photoErr && ps.reason !== photoErr ? '｜' + photoErr : ''}`, 'error');
        }
        else showToast('⚠️ LINE 推播失敗：' + (r.error || (r.result && r.result.message) || ('HTTP ' + res.status)), 'error');
      } catch (err) {
        showToast('⚠️ LINE 推播失敗：' + err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    function copyCurrentMagicLink() {
      const idText = document.getElementById('line-card-id').textContent;
      const locText = document.getElementById('line-card-loc').textContent;
      const noteText = document.getElementById('line-card-note').textContent;
      const slaText = document.getElementById('line-card-sla').textContent;
      const shareMsg = `【工地缺失改善通知 ${idText}】\n${locText}\n說明：${noteText}\n${slaText}`;
      copyTextToClipboard(shareMsg);
      showToast('🔗 已複製缺失派單通知文字！', 'success');
    }

    function openVendorFromLineCard() {
      switchMainTab('vendor');
      if (currentVendorTicketId) {
        selectVendorTicket(currentVendorTicketId);
      }
      goToVendorCard(1);
    }

    // ====================================================
    // 4. Vendor 2-Card View
    // ====================================================
    function populateVendorDropdown() {
      const sel = document.getElementById('vendor-ticket-select');
      const emptyCard = document.getElementById('vendor-empty-card');
      const card1 = document.getElementById('vendor-card-1');
      const card2 = document.getElementById('vendor-card-2');
      if (!sel) return;

      if (defects.length === 0) {
        sel.innerHTML = '<option value="">尚無缺失單</option>';
        if (emptyCard) emptyCard.classList.remove('hidden');
        if (card1) card1.classList.add('hidden');
        if (card2) card2.classList.add('hidden');
        return;
      }

      if (emptyCard) emptyCard.classList.add('hidden');
      if (!currentVendorTicketId || !defects.find(d => d.id === currentVendorTicketId)) {
        currentVendorTicketId = defects[0].id;
      }

      sel.innerHTML = defects.map(d =>
        `<option value="${d.id}" ${d.id === currentVendorTicketId ? 'selected' : ''}>#${d.id}｜${d.building} ${d.floor} (${d.trade})</option>`
      ).join('');

      goToVendorCard(currentVendorCard);
      renderVendorTicketView(currentVendorTicketId);
    }

    function selectVendorTicket(ticketId) {
      if (!ticketId) return;
      currentVendorTicketId = ticketId;
      renderVendorTicketView(ticketId);
    }

    function renderVendorTicketView(ticketId) {
      const d = defects.find(item => item.id === ticketId) || defects[0];
      if (!d) return;

      document.getElementById('vendor-view-contractor').textContent = d.vendor;
      document.getElementById('vendor-view-id').textContent = `#${d.id} ・ ${d.trade}`;
      document.getElementById('vendor-view-deadline').textContent = `⏰ 期限：${d.dueDate}`;
      document.getElementById('vendor-view-location').textContent = `📍 ${d.building} ・ ${d.floor} ・ ${d.area}`;
      document.getElementById('vendor-view-note').textContent = d.description;
      document.getElementById('vendor-view-before-img').src = defectSitePhotoUrl(d);
      const afterPreview = document.getElementById('vendor-view-after-img');
      if (afterPreview) afterPreview.src = d.afterImg || '';
      if (ticketId !== lastVendorCanvasTicketId) {
        lastVendorCanvasTicketId = ticketId;
        vendorAfterMarks = [];
        if (d.afterImg) {
          const img = new Image();
          img.onload = function() {
            vendorAfterPhotoElement = img;
            redrawVendorAfterCanvas();
          };
          img.src = d.afterImg;
        } else {
          vendorAfterPhotoElement = null;
          redrawVendorAfterCanvas();
        }
      }

      const badge = document.getElementById('vendor-view-status-badge');
      const statusMeta = getStatusBadgeMeta(d.status);
      badge.textContent = statusMeta.label;
      badge.className = `px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.cls}`;

      const stepMap = [
        { id: 'vstep-open', key: 'OPEN' },
        { id: 'vstep-progress', key: 'IN_PROGRESS' },
        { id: 'vstep-review', key: 'PENDING_REVIEW' },
        { id: 'vstep-closed', key: 'CLOSED' }
      ];
      stepMap.forEach(st => {
        const el = document.getElementById(st.id);
        if (!el) return;
        if (d.status === st.key) {
          el.className = 'py-1 px-1 rounded-lg font-bold bg-emerald-500 text-slate-950 shadow';
        } else {
          el.className = 'py-1 px-1 rounded-lg font-medium text-slate-400 bg-slate-950';
        }
      });
    }

    function vendorMarkInProgress() {
      const d = defects.find(item => item.id === currentVendorTicketId);
      if (!d) return;
      d.status = 'IN_PROGRESS';
      saveDefectsToStorage();
      renderVendorTicketView(d.id);
      renderAdminBoard();
      updateDefectOnSupabase(d.id, { status: 'IN_PROGRESS' }).catch(function(err) {
        console.error(err);
      });
      showToast(`🛠️ 已將 #${d.id} 更新為「施工中」`, 'info');
    }

    function useSampleAfterPhoto() {}

    let hasUploadedAfterPhotoInSession = false;

    function handleVendorAfterUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        compressUploadedImage(e.target.result, 800, 600, 0.78, function(compressedUrl) {
          const afterPreview = document.getElementById('vendor-view-after-img');
          if (afterPreview) afterPreview.src = compressedUrl;
          hasUploadedAfterPhotoInSession = true;
          vendorAfterMarks = [];
          const img = new Image();
          img.onload = function() {
            vendorAfterPhotoElement = img;
            redrawVendorAfterCanvas();
          };
          img.src = compressedUrl;
          const d = defects.find(item => item.id === currentVendorTicketId);
          if (d) {
            d.afterImg = compressedUrl;
            saveDefectsToStorage();
          }
          const badge = document.getElementById('vendor-after-badge');
          if (badge) badge.textContent = '✅ 完工照已載入，請畫紅圈後點確認完工';
          showToast('📷 完工照已載入！請在畫布上標記修繕位置', 'success');
        });
      };
      reader.readAsDataURL(file);
    }

    let vendorSubmitBusy = false;

    function vendorSubmitCompletion() {
      if (vendorSubmitBusy) return;
      const d = defects.find(item => item.id === currentVendorTicketId) || defects[0];
      if (!d) {
        showToast('請先由「1.拍照派單」新增缺失單', 'info');
        return;
      }
      const afterCanvas = document.getElementById('vendor-after-canvas');
      const afterPreview = document.getElementById('vendor-view-after-img');
      let localAfter = '';
      try {
        if (vendorAfterPhotoElement && afterCanvas) {
          localAfter = afterCanvas.toDataURL('image/jpeg', 0.78);
        }
      } catch (err) {
        console.error(err);
      }
      if (!localAfter && afterPreview && afterPreview.src && afterPreview.src.indexOf('data:image') === 0) {
        localAfter = afterPreview.src;
      }
      if (!localAfter && d.afterImg && String(d.afterImg).indexOf('data:image') === 0) {
        localAfter = d.afterImg;
      }
      if (!localAfter) {
        showToast('請先拍完工照，畫紅圈後再按確認完工', 'error');
        return;
      }

      const noteVal = (document.getElementById('vendor-reply-note') && document.getElementById('vendor-reply-note').value || '').trim()
        || '已依規定修補改善完成，請工務複驗。';
      d.afterImg = localAfter;
      d.vendorNote = noteVal;
      d.status = 'PENDING_REVIEW';
      if (afterPreview) afterPreview.src = localAfter;

      const reportText = [
        `✅【工地缺失完工回報 ${d.id}】`,
        `📍 位置：${d.building}・${d.floor}・${d.area}`,
        `👷 工種：${d.trade}（${d.vendor}）`,
        `📝 原始缺失：${d.description}`,
        `🛠️ 完工說明：${d.vendorNote}`,
        `⏰ 狀態：已上傳改善後完工照片，請工務複驗！`
      ].join('\n');
      openLineFriendPicker(reportText);
      openLineReportModalForTicket(d);
      saveDefectsToStorage();
      renderAdminBoard();

      vendorSubmitBusy = true;
      showToast('☁️ 上傳完工現場圖與完工表單（結案才產生 _report）…', 'success');
      (async function() {
        try {
          const afterPicUrl = await uploadDefectPhotoToSupabase(`${d.id}_after_PIC.jpg`, localAfter);
          if (afterPicUrl) {
            d.afterImg = afterPicUrl;
            d.afterPicImg = afterPicUrl;
          }
          const afterFormDataUrl = await captureFormSheetLikeBefore(localAfter, d.vendorNote || d.actionNote, 'after');
          const afterFormUrl = await uploadDefectPhotoToSupabase(`${d.id}_after.jpg`, afterFormDataUrl);
          if (!d.signatures) d.signatures = {};
          d.signatures.after_pic_url = afterPicUrl || null;
          d.signatures.after_form_url = afterFormUrl || null;
          d.signatures.report_url = null;
          await updateDefectOnSupabase(d.id, {
            after_img: d.afterImg || null,
            photo_after: d.afterImg || null,
            status: 'PENDING_REVIEW',
            solution_desc: d.vendorNote || d.actionNote || null,
            signatures: d.signatures
          });
          saveDefectsToStorage();
          showToast('☁️ 已上傳 ' + d.id + '_after_PIC.jpg 與 _after.jpg，待查驗結案再產 _report', 'success');
        } catch (err) {
          console.error(err);
          showToast('⚠️ 雲端上傳失敗：' + (err.message || err), 'error');
        } finally {
          vendorSubmitBusy = false;
        }
      })();
    }

    let lineReportTicket = null;
    async function pushCompletionToLineGroup() {
      const d = lineReportTicket || defects.find(x => x.id === currentVendorTicketId);
      if (!d) { showToast('⚠️ 找不到缺失單', 'error'); return; }
      const btn = document.getElementById('line-completion-push-btn');
      if (btn) btn.disabled = true;
      try {
        const text = (document.getElementById('line-report-textarea') || {}).value || '';
        const canvas = document.getElementById('line-composite-canvas');
        let photo = '', photoData = '', photoErr = '';
        if (canvas) {
          let blob = null;
          try {
            showToast('📤 正在上傳前後對照圖…', 'info');
            blob = await canvasToJpegBlob(canvas, 0.85);
            if (!blob) throw new Error('對照圖轉檔失敗');
            photo = await uploadPhotoToR2(blob, d.projectName || currentProjectName, new Date().toISOString().slice(0, 10), d.id + '-compare.jpg');
          } catch (e) {
            photoErr = e.message || String(e);
            try { if (blob) photoData = await blobToDataUrl(blob); } catch (_) {}
          }
        }
        const res = await fetch('/api/line-push', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'completion', id: d.id, site: d.projectName, text, photo_url: photo, photo_data: photoData })
        });
        const r = await res.json().catch(() => ({}));
        if (res.ok && r.ok) {
          const ps = r.photo || {};
          if (ps.status === 'attached') showToast(`✅ 完工回報已推播到 LINE 群組 (#${d.id})（含對照圖）`, 'success');
          else showToast(`⚠️ 已推播文字 (#${d.id})，但沒附對照圖：${ps.reason || photoErr || '未知原因'}`, 'error');
        } else showToast('⚠️ LINE 推播失敗：' + (r.error || ('HTTP ' + res.status)), 'error');
      } catch (err) {
        showToast('⚠️ LINE 推播失敗：' + err.message, 'error');
      } finally { if (btn) btn.disabled = false; }
    }

    function openLineReportModalForTicket(d) {
      lineReportTicket = d;
      const reportText = [
        `✅【工地缺失完工回報 ${d.id}】`,
        `📍 位置：${d.building}・${d.floor}・${d.area}`,
        `👷 工種：${d.trade}（${d.vendor}）`,
        `📝 原始缺失：${d.description}`,
        `🛠️ 完工說明：${d.vendorNote || '已改善完成，請工務複驗'}`,
        `⏰ 狀態：已上傳改善後完工照片，請工務複驗！`
      ].join('\n');

      const ta = document.getElementById('line-report-textarea');
      if (ta) ta.value = reportText;

      const lineBtn = document.getElementById('line-direct-url-btn');
      if (lineBtn) {
        lineBtn.setAttribute('href', 'line://msg/text/' + encodeURIComponent(reportText));
        lineBtn.removeAttribute('target');
      }

      drawBeforeAfterCompositeCanvas(d);

      const modal = document.getElementById('line-report-modal');
      if (modal) modal.classList.remove('hidden');

      showToast(`✅ #${d.id} 已更新為「待複驗」！請點選綠色按鈕傳送 LINE`, 'success');
    }

    function onDirectLineLinkClick(event) {
      if (event) event.preventDefault();
      const ta = document.getElementById('line-report-textarea');
      openLineFriendPicker(ta ? ta.value : '');
    }

    function closeLineReportModal() {
      const modal = document.getElementById('line-report-modal');
      if (modal) modal.classList.add('hidden');
    }

    async function renderCompletionReportDataUrl(d) {
      const before = await loadCanvasImage(d.beforeImg);
      const after = await loadCanvasImage(d.afterImg);
      const W = 800;
      const H = 480;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#06C755';
      ctx.fillRect(0, 0, W, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Inter, Noto Sans TC, sans-serif';
      ctx.fillText(`✅ 前後對照與三方簽認總表 #${d.id} ｜ ${d.building || ''} ${d.floor || ''} ${d.area || ''} (${d.trade || ''})`, 16, 31);

      if (before) ctx.drawImage(before, 12, 58, 382, 268);
      else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(12, 58, 382, 268);
      }
      ctx.fillStyle = 'rgba(225, 29, 72, 0.9)';
      ctx.fillRect(12, 58, 130, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, Noto Sans TC, sans-serif';
      ctx.fillText('🔴 改善前 (before)', 20, 77);

      if (after) ctx.drawImage(after, 406, 58, 382, 268);
      else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(406, 58, 382, 268);
      }
      ctx.fillStyle = 'rgba(5, 150, 105, 0.95)';
      ctx.fillRect(406, 58, 148, 28);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🟢 改善後 (after)', 414, 77);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 336, W, 48);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px Inter, Noto Sans TC, sans-serif';
      ctx.fillText(`🛠️ 修繕說明：${(d.vendorNote || '已改善完成，請工務複驗').slice(0, 48)}`, 16, 366);

      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 384, W, 96);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, Noto Sans TC, sans-serif';
      const ins = d.signatures && d.signatures.inspector ? d.signatures.inspector : {};
      const ven = d.signatures && d.signatures.vendor ? d.signatures.vendor : {};
      const mgr = d.signatures && d.signatures.manager ? d.signatures.manager : {};
      ctx.fillText(`甲方查驗：${d.inspectorName || ins.name || ''}  ${d.signInspectorTime || ins.time || ''}`, 16, 412);
      ctx.fillText(`乙方回報：${d.vendor || ven.name || ''}  ${d.signVendorTime || ven.time || ''}`, 16, 436);
      ctx.fillText(`工地主管：${d.signManagerName || mgr.name || '待簽認'}  ${d.signManagerTime || mgr.time || ''}`, 16, 460);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px Inter, Noto Sans TC, sans-serif';
      ctx.fillText('系統自動合成，非手動上傳', 560, 460);
      return canvas.toDataURL('image/jpeg', 0.86);
    }

    function drawBeforeAfterCompositeCanvas(d) {
      const canvas = document.getElementById('line-composite-canvas');
      if (!canvas) return;
      renderCompletionReportDataUrl(d).then(function(dataUrl) {
        const img = new Image();
        img.onload = function() {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = dataUrl;
      }).catch(function() {});
    }

    function downloadCompositeImage() {
      const canvas = document.getElementById('line-composite-canvas');
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `完工回報對照圖_${currentVendorTicketId || 'DEF'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('💾 已下載「改善前後對照圖」，可直接傳進 LINE 對話！', 'success');
    }

    function shareCompositeWithWebShare() {
      const canvas = document.getElementById('line-composite-canvas');
      const ta = document.getElementById('line-report-textarea');
      const text = ta ? ta.value : '工地缺失完工回報';
      if (canvas && canvas.toBlob && navigator.canShare) {
        canvas.toBlob(function(blob) {
          if (!blob) return;
          const file = new File([blob], 'completion_report.jpg', { type: 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({
              title: '工地缺失完工回報',
              text: text,
              files: [file]
            }).catch(function() {});
            return;
          }
          openLineFriendPicker(text);
        }, 'image/jpeg', 0.85);
      } else {
        openLineFriendPicker(text);
      }
    }

    // ====================================================
    // 5. Admin Single-Card Pager
    // ====================================================
    function isTicketOverdue(d) {
      if (d.status === 'CLOSED') return false;
      const today = new Date().toISOString().slice(0, 10);
      return d.dueDate < today;
    }

    function getStatusBadgeMeta(status) {
      switch (status) {
        case 'OPEN':
          return { label: '待改善', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
        case 'IN_PROGRESS':
          return { label: '施工中', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
        case 'PENDING_REVIEW':
          return { label: '待複驗', cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
        case 'CLOSED':
          return { label: '已結案', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
        default:
          return { label: status, cls: 'bg-slate-700 text-slate-300 border-slate-600' };
      }
    }

    function setAdminDisplayMode(mode) {
      adminDisplayMode = mode;
      renderAdminBoard();
    }

    function renderAdminBoard() {
      const total = defects.length;
      const openCount = defects.filter(d => d.status === 'OPEN' || d.status === 'IN_PROGRESS').length;
      const revCount = defects.filter(d => d.status === 'PENDING_REVIEW').length;
      const closedCount = defects.filter(d => d.status === 'CLOSED').length;

      // Update Admin KPIs
      document.getElementById('kpi-total').textContent = total;
      document.getElementById('kpi-overdue').textContent = openCount;
      document.getElementById('kpi-review').textContent = revCount;
      document.getElementById('kpi-closed').textContent = closedCount;

      // Update Overview KPIs
      const ovTotal = document.getElementById('ov-kpi-total');
      const ovOpen = document.getElementById('ov-kpi-open');
      const ovPending = document.getElementById('ov-kpi-pending');
      const ovClosed = document.getElementById('ov-kpi-closed');
      if (ovTotal) ovTotal.textContent = total;
      if (ovOpen) ovOpen.textContent = openCount;
      if (ovPending) ovPending.textContent = revCount;
      if (ovClosed) ovClosed.textContent = closedCount;

      const topBadge = document.getElementById('admin-pending-badge');
      if (topBadge) {
        topBadge.textContent = `${revCount > 0 ? revCount : total}`;
      }

      const tradeFilterEl = document.getElementById('admin-filter-trade');
      const tradeFilter = tradeFilterEl ? tradeFilterEl.value : 'ALL';
      const overdueOnly = document.getElementById('admin-filter-overdue').checked;

      const filtered = defects.filter(d => {
        if (currentAdminStatusFilter === 'OPEN' && d.status !== 'OPEN' && d.status !== 'IN_PROGRESS') return false;
        if (currentAdminStatusFilter === 'PENDING_REVIEW' && d.status !== 'PENDING_REVIEW') return false;
        if (currentAdminStatusFilter === 'CLOSED' && d.status !== 'CLOSED') return false;
        if (tradeFilter !== 'ALL' && d.trade !== tradeFilter) return false;
        if (overdueOnly && !isTicketOverdue(d)) return false;
        return true;
      });

      const singleDeckEl = document.getElementById('admin-single-card-deck');
      if (!singleDeckEl) return;

      if (filtered.length === 0) {
        singleDeckEl.innerHTML = `
          <div class="py-10 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
            <div class="text-3xl">📋</div>
            <div class="text-sm font-bold text-white">目前此分類尚無缺失卡片</div>
            <p class="text-xs text-slate-400">可切換上方狀態篩選，或點選下方按鈕前往「1.拍照提報」新增缺失。</p>
            <div class="flex items-center gap-2">
              <button type="button" onclick="setAdminStatusFilter('ALL')" class="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
                顯示全部 (${total})
              </button>
              <button type="button" onclick="switchMainTab('pwa'); goToPwaCard(1);" class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow">
                ➕ 新增拍照提報
              </button>
            </div>
          </div>
        `;
        return;
      }

      if (currentAdminCardIndex >= filtered.length) currentAdminCardIndex = 0;
      if (currentAdminCardIndex < 0) currentAdminCardIndex = filtered.length - 1;
      const d = filtered[currentAdminCardIndex];
      const overdue = isTicketOverdue(d);
      const st = getStatusBadgeMeta(d.status);
      const projLabel = d.projectName || currentProjectName;
      const inspLabel = d.inspectorName || currentInspectorName;
      const isClosed = d.status === 'CLOSED';

      const locBadge = `${d.building}-${d.floor}`;
      const timeStr = d.createdAt || currentCaptureTimeStr;
      const actText = d.actionNote || '請立即加裝絕緣防護內蓋並張貼「送電中勿動」警示標誌';
      const triBoxesHtml = buildTriPartySignatureBoxesHtml(d, d.id);

      singleDeckEl.innerHTML = `
        <div class="page-card space-y-2.5 flex-1 flex flex-col justify-between">
          <div class="space-y-2.5">
            <!-- Card Top Status & Pager Index -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-md bg-slate-950 text-amber-400 font-bold text-xs border border-slate-800">
                  第 ${currentAdminCardIndex + 1} / ${filtered.length} 張
                </span>
                <span class="mono text-xs font-bold text-white">#${d.id}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.cls}">${st.label}</span>
                <button type="button" onclick="deleteSingleTicket('${d.id}')" title="刪除此張卡片" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs">🗑️</button>
              </div>
            </div>

            <!-- CIRCLED PART 1: Dark Photo Frame + Bottom Inspection Caption Bar -->
            <div class="rounded-2xl overflow-hidden bg-[#18181b] border border-slate-700 shadow-lg">
              <div class="grid grid-cols-2 gap-1 bg-slate-950 p-1">
                <div onclick="openReviewModal('${d.id}')" class="cursor-pointer rounded-xl overflow-hidden bg-slate-900 relative aspect-[4/3]">
                  <img src="${defectSitePhotoUrl(d)}" alt="改善前" class="w-full h-full object-cover" />
                  <span class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-rose-600/90 text-[10px] font-bold text-white">🔴 改善前缺失</span>
                </div>
                <div onclick="openReviewModal('${d.id}')" class="cursor-pointer rounded-xl overflow-hidden bg-slate-900 relative aspect-[4/3] flex items-center justify-center">
                  <img src="${defectAfterPhotoUrl(d) || d.afterImg || ''}" alt="改善後" class="w-full h-full object-cover" />
                  <span class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded ${d.afterImg ? 'bg-emerald-600/95' : 'bg-slate-900/90'} text-[10px] font-bold text-white">
                    ${d.afterImg ? '🟢 廠商已傳完工照' : '⏳ 待傳完工照'}
                  </span>
                </div>
              </div>
              <div class="bg-[#18181b] px-3 py-2 text-center border-t border-slate-800 space-y-0.5">
                <div class="text-xs sm:text-sm font-extrabold text-amber-400 tracking-wide">
                  【現場查驗】${projLabel} ｜ ${locBadge}
                </div>
                <div class="text-[11px] text-slate-300 font-medium">
                  拍攝時間：${timeStr} ｜ 查驗員：${inspLabel}
                </div>
              </div>
            </div>

            <!-- Middle Side-by-Side Boxes: 現場缺失現況說明 & 改善要求與預防措施 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div class="rounded-xl bg-[#fff1f2] border border-[#fecdd3] p-2.5 space-y-1 text-slate-900">
                <div class="text-[11px] font-bold text-[#9f1239]">⚠️ 現場缺失現況說明</div>
                <div class="text-xs font-extrabold text-slate-900 leading-snug">${d.description}</div>
              </div>
              <div class="rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] p-2.5 space-y-1 text-slate-900">
                <div class="text-[11px] font-bold text-[#065f46]">🛠️ 改善要求與預防措施</div>
                <div class="text-xs font-extrabold text-slate-900 leading-snug">${actText}</div>
              </div>
            </div>

            <!-- CIRCLED PART 2: 三方簽章覆核 (點選任一方格即可開啟「手寫簽名板」進行電子簽名) -->
            <div class="rounded-2xl bg-[#f1f5f9] border border-slate-300 p-3 space-y-2 text-slate-900 shadow">
              <div class="flex flex-wrap items-center justify-between gap-1">
                <div class="text-[11px] sm:text-xs font-extrabold text-slate-700">
                  三方簽章覆核 (點選任一方格即可開啟「手寫簽名板」進行電子簽名)
                </div>
                <button type="button" onclick="openSignaturePadModal('inspector', '${d.id}')" class="px-2.5 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-extrabold transition">
                  ✍️ 點擊方格立即手寫簽核
                </button>
              </div>

              <!-- 3 Interactive Electronic Signature Cards -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                ${triBoxesHtml}
              </div>

              <div class="pt-1 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 font-medium">
                <span>由「工地缺失改善管理系統」自動排版生成 (適配手機 LINE 閱讀)</span>
                <span class="mono font-semibold text-slate-600">產出編號：${d.reportCode || d.id}</span>
              </div>
            </div>

            <!-- Quick One-Click Approve / Reject Bar -->
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-2">
              <input type="text" id="card-audit-note-${d.id}" value="${d.auditNote || '現場查驗核對無誤，三方簽章准予結案。'}" placeholder="輸入查驗結案意見或退回原因..." class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none" />
              <div class="grid grid-cols-2 gap-2">
                <button type="button" onclick="engineerApproveAndCloseOnCard('${d.id}')" class="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow transition flex items-center justify-center gap-1">
                  <span>✅ 三方全簽・正式結案</span>
                </button>
                <button type="button" onclick="engineerRejectOnCard('${d.id}')" class="py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition flex items-center justify-center gap-1">
                  <span>❌ 退回廠商重修</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Card Footer: LINE Report / PDF / Prev & Next Card -->
          <div class="space-y-1.5 pt-1">
            <div class="grid grid-cols-3 gap-1.5">
              <button type="button" onclick="sendClosureLineReport('${d.id}')" class="py-2 px-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-[11px] shadow transition">
                💬 LINE 查驗通知
              </button>
              <button type="button" onclick="openReviewModal('${d.id}')" class="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-[11px] transition">
                🔍 滑桿放大比對
              </button>
              <button type="button" onclick="openSinglePdfModal('${d.id}')" class="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] transition">
                📄 簽章驗收單PDF
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button type="button" onclick="stepAdminCard(-1)" class="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition">
                ⬅ 上一張卡片
              </button>
              <button type="button" onclick="stepAdminCard(1)" class="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition">
                下一張卡片 ➔
              </button>
            </div>
          </div>
        </div>
      `;
    }

    function toggleTriPartySign(ticketId, fieldName, checked) {
      const d = defects.find(item => item.id === ticketId);
      if (!d) return;
      d[fieldName] = checked;
      saveDefectsToStorage();
    }

    function engineerApproveAndCloseOnCard(ticketId) {
      const d = defects.find(item => item.id === ticketId);
      if (!d) return;
      const noteEl = document.getElementById('card-audit-note-' + ticketId);
      if (noteEl && noteEl.value.trim()) {
        d.auditNote = noteEl.value.trim();
      } else {
        d.auditNote = '現場查驗核對無誤，三方簽章准予結案。';
      }
      const nowTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
      d.projectName = currentProjectName;
      d.inspectorName = currentInspectorName;
      d.signVendor = true;
      d.signInspector = true;
      d.signManager = true;
      d.signInspectorName = currentInspectorName;
      d.signInspectorTime = d.signInspectorTime || nowTime;
      d.signInspectorImg = d.signInspectorImg || generateStylizedSignatureDataUrl(currentInspectorName, true);
      d.signVendorName = d.vendor || '宏昇水電工程';
      d.signVendorTime = d.signVendorTime || nowTime;
      d.signVendorImg = d.signVendorImg || generateStylizedSignatureDataUrl(d.vendor || '協力廠商', true);
      d.signManagerName = d.signManagerName || '工地主任 / 所長';
      d.signManagerTime = nowTime;
      d.signManagerImg = d.signManagerImg || generateStylizedSignatureDataUrl('工地主任', true);
      d.status = 'CLOSED';
      d.closedAt = nowTime;
      saveDefectsToStorage();
      renderAdminBoard();
      populateVendorDropdown();
      showToast(`✅ #${d.id} 結案中，正在合成 _report.jpg…`, 'success');
      archiveClosedReport(d).then(function(reportUrl) {
        return updateDefectOnSupabase(d.id, {
          status: 'CLOSED',
          signatures: Object.assign({}, d.signatures || {}, { report_url: reportUrl || null })
        });
      }).then(function() {
        saveDefectsToStorage();
        showToast(`✅ #${d.id} 已查驗結案，_report.jpg 已歸檔`, 'success');
      }).catch((err) => {
        console.error(err);
        showToast('⚠️ 結案總表未上傳：' + (err.message || err), 'error');
      });
    }

    function engineerRejectOnCard(ticketId) {
      const d = defects.find(item => item.id === ticketId);
      if (!d) return;
      const noteEl = document.getElementById('card-audit-note-' + ticketId);
      const reason = (noteEl && noteEl.value.trim()) ? noteEl.value.trim() : '現場查驗未通過，請廠商重新修補後再上傳照片。';
      d.auditNote = reason;
      d.vendorNote = `【查驗退回：${currentInspectorName}】${reason}`;
      d.signInspector = false;
      d.signManager = false;
      d.status = 'OPEN';
      saveDefectsToStorage();
      updateDefectOnSupabase(d.id, { status: 'OPEN' }).catch((err) => {
        console.error(err);
        showToast('⚠️ 雲端退回狀態未更新：' + (err.message || err), 'error');
      });
      renderAdminBoard();
      populateVendorDropdown();
      showToast(`❌ #${d.id} 已退回「待改善 (OPEN)」！`, 'info');
    }

    function sendClosureLineReport(ticketId) {
      const d = defects.find(item => item.id === ticketId);
      if (!d) return;
      const stLabel = getStatusBadgeMeta(d.status).label;
      const msg = [
        `📋【工地缺失查驗與結案通知 #${d.id}】`,
        `🏗️ 專案：${d.projectName || currentProjectName}`,
        `📍 位置：${d.building}・${d.floor}・${d.area}`,
        `👷 責任工種：${d.trade}（${d.vendor}）`,
        `🔍 查驗人員：${d.inspectorName || currentInspectorName}`,
        `📌 查驗結果：【${stLabel}】${d.auditNote || '現場核對無誤，三方簽章結案。'}`
      ].join('\n');
      openLineFriendPicker(msg);
    }

    function deleteSingleTicket(ticketId) {
      defects = defects.filter(item => item.id !== ticketId);
      saveDefectsToStorage();
      renderAdminBoard();
      populateVendorDropdown();
      showToast(`🗑️ 已刪除 #${ticketId}`, 'info');
    }

    function quickChangeStatus(ticketId, newStatus) {
      const d = defects.find(item => item.id === ticketId);
      if (!d) return;
      d.status = newStatus;
      saveDefectsToStorage();
      renderAdminBoard();
    }

    function sendLineUrge(ticketId) {
      showToast(`📲 已產生逾期催辦通知 (#${ticketId})`, 'success');
    }

    // ====================================================
    // 6. Review & PDF Modals
    // ====================================================
    function openReviewModal(ticketId) {
      const d = defects.find(item => item.id === ticketId);
      if (!d) return;
      currentReviewTicketId = ticketId;

      document.getElementById('review-modal-id').textContent = '#' + d.id;
      document.getElementById('review-modal-loc').textContent = `${d.building}・${d.floor}・${d.area}`;
      document.getElementById('review-modal-vendor').textContent = `${d.trade}・${d.vendor}`;
      document.getElementById('review-modal-due').textContent = d.dueDate;
      document.getElementById('review-modal-status').textContent = getStatusBadgeMeta(d.status).label;
      document.getElementById('review-modal-before-img').src = d.beforeImg || '';
      document.getElementById('review-modal-desc').textContent = d.description;

      const finalAfter = d.afterImg || d.beforeImg || '';
      document.getElementById('review-modal-after-img').src = finalAfter;
      document.getElementById('review-slider-before-img').src = d.beforeImg || '';
      document.getElementById('review-slider-after-img').src = finalAfter;
      updateReviewSliderPosition(50);

      document.getElementById('review-modal-vendor-note').textContent = d.vendorNote
        ? `完工說明：${d.vendorNote}`
        : '（廠商尚未上傳完工照片）';

      document.getElementById('review-audit-Input').value = '';
      document.getElementById('review-modal').classList.remove('hidden');
    }

    function closeReviewModal() {
      document.getElementById('review-modal').classList.add('hidden');
    }

    function approveReviewTicket() {
      const d = defects.find(item => item.id === currentReviewTicketId);
      if (!d) return;
      d.status = 'CLOSED';
      saveDefectsToStorage();
      closeReviewModal();
      renderAdminBoard();
      populateVendorDropdown();
      archiveClosedReport(d).then(function(reportUrl) {
        return updateDefectOnSupabase(d.id, {
          status: 'CLOSED',
          signatures: Object.assign({}, d.signatures || {}, { report_url: reportUrl || null })
        });
      }).then(function() {
        saveDefectsToStorage();
        showToast(`✅ #${d.id} 已複驗結案，_report.jpg 已歸檔`, 'success');
      }).catch((err) => {
        console.error(err);
        showToast('⚠️ 結案總表未上傳：' + (err.message || err), 'error');
      });
    }

    function rejectReviewTicket() {
      const d = defects.find(item => item.id === currentReviewTicketId);
      if (!d) return;
      const reason = document.getElementById('review-audit-Input').value.trim() || '請重新修補後再上傳照片。';
      d.status = 'OPEN';
      d.vendorNote = `【退回重改】${reason}`;
      saveDefectsToStorage();
      updateDefectOnSupabase(d.id, { status: 'OPEN' }).catch((err) => {
        console.error(err);
        showToast('⚠️ 雲端退回狀態未更新：' + (err.message || err), 'error');
      });
      closeReviewModal();
      renderAdminBoard();
      populateVendorDropdown();
      showToast(`❌ #${d.id} 已退回待改善`, 'info');
    }

    function openSinglePdfModal(ticketId) {
      let d = ticketId ? defects.find(item => item.id === ticketId) : null;
      if (!d) {
        const canvas = document.getElementById('defect-canvas');
        const imgUrl = canvas ? canvas.toDataURL('image/jpeg', 0.78) : '';
        document.getElementById('pdf-single-id').textContent = '單號：' + document.getElementById('line-card-id').textContent;
        document.getElementById('pdf-single-loc').textContent = document.getElementById('line-card-loc').textContent.replace('📍 ', '');
        document.getElementById('pdf-single-trade').textContent = currentTrade;
        document.getElementById('pdf-single-vendor').textContent = document.getElementById('line-card-vendor').textContent;
        document.getElementById('pdf-single-due').textContent = document.getElementById('line-card-sla').textContent.replace('限期：', '');
        document.getElementById('pdf-single-note').textContent = document.getElementById('pwa-note').value || '現場查驗缺失';
        document.getElementById('pdf-single-before-img').src = imgUrl;
      } else {
        document.getElementById('pdf-single-id').textContent = '單號：#' + d.id;
        document.getElementById('pdf-single-loc').textContent = `${d.building}・${d.floor}・${d.area}`;
        document.getElementById('pdf-single-trade').textContent = d.trade;
        document.getElementById('pdf-single-vendor').textContent = d.vendor;
        document.getElementById('pdf-single-due').textContent = d.dueDate + ' 前';
        document.getElementById('pdf-single-note').textContent = d.description;
        document.getElementById('pdf-single-before-img').src = d.beforeImg || '';
      }
      const pEl = document.getElementById('pdf-single-project');
      const iEl = document.getElementById('pdf-single-inspector');
      const sInsp = document.getElementById('pdf-sign-inspector');
      const proj = (d && d.projectName) ? d.projectName : currentProjectName;
      const insp = (d && d.inspectorName) ? d.inspectorName : currentInspectorName;
      const locShort = d ? `${d.building}-${d.floor}` : ((document.getElementById('pwa-building').value || 'A棟') + '-' + (document.getElementById('pwa-floor').value || '2F'));
      const timeStr = (d && d.createdAt) ? d.createdAt : currentCaptureTimeStr;

      if (pEl) pEl.textContent = '專案：' + proj;
      if (iEl) iEl.textContent = insp;
      if (sInsp) sInsp.textContent = insp + (d && d.status === 'CLOSED' ? ' (已簽章結案✅)' : ' (查驗中)');

      const capMain = document.getElementById('pdf-photo-caption-main');
      const capSub = document.getElementById('pdf-photo-caption-sub');
      if (capMain) capMain.textContent = `【現場查驗】${proj} ｜ ${locShort}`;
      if (capSub) capSub.textContent = `拍攝時間：${timeStr} ｜ 查驗員：${insp}`;

      const actEl = document.getElementById('pdf-single-action-note');
      if (actEl) {
        actEl.textContent = (d && d.actionNote)
          ? d.actionNote
          : ((document.getElementById('pwa-action-note') && document.getElementById('pwa-action-note').value) || '請立即加裝絕緣防護內蓋並張貼「送電中勿動」警示標誌');
      }
      const pdfCode = document.getElementById('pdf-report-code');
      if (pdfCode) {
        pdfCode.textContent = '產出編號：' + ((d && (d.reportCode || d.id)) ? (d.reportCode || d.id) : draftSignatures.reportCode);
      }
      const pdfGrid = document.getElementById('pdf-tri-signature-grid');
      if (pdfGrid) {
        pdfGrid.innerHTML = buildTriPartySignatureBoxesHtml(d, d ? d.id : null);
      }
      document.getElementById('single-pdf-modal').classList.remove('hidden');
    }

    function openSinglePdfModalFromReview() {
      closeReviewModal();
      openSinglePdfModal(currentReviewTicketId);
    }

    function closeSinglePdfModal() {
      document.getElementById('single-pdf-modal').classList.add('hidden');
    }

    function openReportExportModal() {
      const tbody = document.getElementById('report-modal-tbody');
      tbody.innerHTML = defects.map(d => {
        const overdue = isTicketOverdue(d);
        return `
          <tr>
            <td class="py-2 px-2.5 mono font-bold text-amber-400">#${d.id}</td>
            <td class="py-2 px-2.5">${d.building}・${d.floor}・${d.area}</td>
            <td class="py-2 px-2.5">${d.trade}</td>
            <td class="py-2 px-2.5">${d.vendor}</td>
            <td class="py-2 px-2.5 max-w-xs truncate">${d.description}</td>
            <td class="py-2 px-2.5 ${overdue ? 'text-rose-400 font-bold' : ''}">${d.dueDate}</td>
            <td class="py-2 px-2.5 font-bold">${getStatusBadgeMeta(d.status).label}</td>
          </tr>
        `;
      }).join('');

      const badges = document.getElementById('report-summary-badges');
      const overdueCount = defects.filter(isTicketOverdue).length;
      const closedCount = defects.filter(d => d.status === 'CLOSED').length;
      badges.innerHTML = `
        <span class="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white">總筆數：<strong>${defects.length}</strong></span>
        <span class="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300">逾期：<strong>${overdueCount}</strong></span>
        <span class="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">已結案：<strong>${closedCount}</strong></span>
      `;
      document.getElementById('report-export-modal').classList.remove('hidden');
    }

    function closeReportExportModal() {
      document.getElementById('report-export-modal').classList.add('hidden');
    }

    function downloadExcelCsvReport() {
      const headers = ['缺失單號', '棟別', '樓層戶別', '區域', '責任工種', '負責廠商', '缺失說明', '改善期限', '狀態', '完工備註'];
      const rows = defects.map(d => [
        d.id,
        d.building,
        d.floor,
        d.area,
        d.trade,
        d.vendor,
        `"${(d.description || '').replace(/"/g, '""')}"`,
        d.dueDate,
        getStatusBadgeMeta(d.status).label,
        `"${(d.vendorNote || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '工地缺失追蹤報表.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📊 已下載 Excel (CSV) 報表！', 'success');
    }

    // ====================================================
    // 7. Single-Card Navigation & Utilities
    // ====================================================
    function switchMainTab(tabKey) {
      ['overview', 'pwa', 'vendor', 'admin', 'arch'].forEach(k => {
        const view = document.getElementById('view-' + k);
        const btn = document.getElementById('tab-btn-' + k);
        if (view) {
          if (k === tabKey) view.classList.remove('hidden');
          else view.classList.add('hidden');
        }
        if (btn) {
          if (k === tabKey) {
            btn.className = 'py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-slate-950 shadow truncate';
          } else {
            btn.className = 'py-1.5 px-1.5 rounded-lg text-xs font-medium transition-all text-slate-300 hover:text-white truncate';
          }
        }
      });
      if (tabKey === 'admin' || tabKey === 'vendor') {
        refreshFromCloud(true);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goToPwaCard(stepNum) {
      currentPwaCard = stepNum;
      [1, 2, 3, 4].forEach(n => {
        const card = document.getElementById('pwa-step-' + n);
        const pill = document.getElementById('pwa-step-pill-' + n);
        if (card) {
          if (n === stepNum) card.classList.remove('hidden');
          else card.classList.add('hidden');
        }
        if (pill) {
          if (n === stepNum) {
            pill.className = 'py-1.5 px-1 rounded-lg font-bold bg-amber-500 text-slate-950 text-center truncate transition shadow';
          } else {
            pill.className = 'py-1.5 px-1 rounded-lg font-medium text-slate-400 hover:text-white text-center truncate transition';
          }
        }
      });
      if (stepNum === 4) {
        syncAnnotatedPreviewToLineCard();
        updateLiveLinePreviewText();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goToVendorCard(stepNum) {
      currentVendorCard = stepNum;
      if (defects.length === 0) return;
      [1, 2].forEach(n => {
        const card = document.getElementById('vendor-card-' + n);
        const pill = document.getElementById('vendor-pill-' + n);
        if (card) {
          if (n === stepNum) card.classList.remove('hidden');
          else card.classList.add('hidden');
        }
        if (pill) {
          if (n === stepNum) {
            pill.className = 'py-1.5 px-2 rounded-md font-bold bg-emerald-500 text-slate-950 text-center transition shadow';
          } else {
            pill.className = 'py-1.5 px-2 rounded-md font-medium text-slate-400 hover:text-white text-center transition';
          }
        }
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetAdminCardIndexAndRender() {
      currentAdminCardIndex = 0;
      renderAdminBoard();
    }

    function stepAdminCard(delta) {
      currentAdminCardIndex += delta;
      renderAdminBoard();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function jumpToAdminCard(idx) {
      currentAdminCardIndex = idx;
      renderAdminBoard();
    }

    function copyJsonPayload() {}
    function toggleSitesBannerDetails() {}
    function dismissSitesBanner() {}
    function scrollToPwaStep(stepId) {}
    function quickFilterTrade(trade) {}

    function resetAdminFilters() {
      const t = document.getElementById('admin-filter-trade');
      const o = document.getElementById('admin-filter-overdue');
      if (t) t.value = 'ALL';
      if (o) o.checked = false;
      renderAdminBoard();
    }

    function setVendorQuickReply(text) {
      const inp = document.getElementById('vendor-reply-note');
      if (inp) {
        inp.value = text;
        showToast('⚡ 已帶入完工說明', 'info');
      }
    }

    function setDrawColor(colorHex) {
      currentDrawColor = colorHex;
      const map = {
        '#ff1e42': 'color-btn-red',
        '#facc15': 'color-btn-amber',
        '#38bdf8': 'color-btn-sky'
      };
      Object.keys(map).forEach(c => {
        const el = document.getElementById(map[c]);
        if (!el) return;
        if (c === colorHex) {
          el.className = `w-4 h-4 rounded-full bg-[${c}] ring-2 ring-white scale-110 transition`;
        } else {
          el.className = `w-4 h-4 rounded-full bg-[${c}] opacity-60 hover:opacity-100 transition`;
        }
      });
    }

    function selectDefectSeverity(level) {
      currentSeverity = level;
      const map = {
        '重大缺失': { id: 'sev-high', activeCls: 'px-2 py-0.5 rounded bg-rose-600 text-white font-bold transition' },
        '一般缺失': { id: 'sev-normal', activeCls: 'px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold transition' },
        '輕微改善': { id: 'sev-minor', activeCls: 'px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-bold transition' }
      };
      Object.keys(map).forEach(k => {
        const btn = document.getElementById(map[k].id);
        if (!btn) return;
        btn.className = (k === level)
          ? map[k].activeCls
          : 'px-2 py-0.5 rounded text-slate-400 hover:text-white transition';
      });
      redrawCanvas();
      syncAnnotatedPreviewToLineCard();
    }

    function toggleAppTheme() {
      isLightMode = !isLightMode;
      document.body.classList.toggle('theme-light', isLightMode);
      const iconEl = document.getElementById('theme-toggle-icon');
      if (iconEl) iconEl.textContent = isLightMode ? '🌙' : '☀️';
      showToast(isLightMode ? '☀️ 已切換至淺色模式' : '🌙 已切換至深色模式', 'info');
    }

    function setReviewCompareMode(mode) {
      const sideView = document.getElementById('review-side-by-side-view');
      const sliderView = document.getElementById('review-slider-view');
      const sideBtn = document.getElementById('cmp-btn-side');
      const sliderBtn = document.getElementById('cmp-btn-slider');
      if (mode === 'slider') {
        if (sliderView) sliderView.classList.remove('hidden');
        if (sideView) sideView.classList.add('hidden');
        if (sliderBtn) sliderBtn.className = 'px-2.5 py-1 rounded-md font-bold bg-amber-500 text-slate-950 transition';
        if (sideBtn) sideBtn.className = 'px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white transition';
      } else {
        if (sideView) sideView.classList.remove('hidden');
        if (sliderView) sliderView.classList.add('hidden');
        if (sideBtn) sideBtn.className = 'px-2.5 py-1 rounded-md font-bold bg-amber-500 text-slate-950 transition';
        if (sliderBtn) sliderBtn.className = 'px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white transition';
      }
    }

    function updateReviewSliderPosition(val) {
      const pct = Math.max(0, Math.min(100, Number(val)));
      const beforeImg = document.getElementById('review-slider-before-img');
      const line = document.getElementById('review-slider-line');
      const range = document.getElementById('review-compare-range');
      if (beforeImg) beforeImg.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      if (line) line.style.left = `${pct}%`;
      if (range && String(range.value) !== String(pct)) range.value = pct;
    }

    function openLineFriendPicker(text) {
      const message = String(text || '').trim();
      if (!message) {
        showToast('沒有可傳送的 LINE 文字', 'error');
        return;
      }
      copyTextToClipboard(message);
      const appUrl = 'line://msg/text/' + encodeURIComponent(message);
      const opener = document.createElement('a');
      opener.href = appUrl;
      opener.style.display = 'none';
      document.body.appendChild(opener);
      opener.click();
      document.body.removeChild(opener);
      showToast('已喚起 LINE App，請在好友／群組名單選擇要傳送的對象（文字已複製）', 'success');
    }

    function copyTextToClipboard(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e) {}
      document.body.removeChild(ta);
    }

    function showToast(message, type) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const el = document.createElement('div');
      const colorCls = type === 'success'
        ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
        : 'bg-slate-900/95 border-amber-500/60 text-amber-200';
      el.className = `pointer-events-auto px-3.5 py-2.5 rounded-xl border shadow-xl text-xs font-medium transition-all duration-300 ${colorCls}`;
      el.textContent = message;
      container.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 250);
      }, type === 'error' ? 8000 : 2600);
    }

    function openEmbedGuideModal() {
      const modal = document.getElementById('embed-guide-modal');
      if (modal) modal.classList.remove('hidden');
      const box = document.getElementById('embed-raw-html-box');
      if (box) {
        box.value = '<!DOCTYPE html>\n<html lang="zh-TW">\n' + document.documentElement.innerHTML + '\n</html>';
      }
    }

    function closeEmbedGuideModal() {
      const modal = document.getElementById('embed-guide-modal');
      if (modal) modal.classList.add('hidden');
    }

    function copyFullHtmlForGoogleSites() {
      const fullHtml = '<!DOCTYPE html>\n<html lang="zh-TW">\n' + document.documentElement.innerHTML + '\n</html>';
      const box = document.getElementById('embed-raw-html-box');
      if (box) box.value = fullHtml;
      copyTextToClipboard(fullHtml);
      showToast('✅ 已複製精簡版 HTML！請至 Google Sites「內嵌程式碼」貼上', 'success');
    }

    function downloadStandaloneHtml() {
      const fullHtml = '<!DOCTYPE html>\n<html lang="zh-TW">\n' + document.documentElement.innerHTML + '\n</html>';
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'index.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('💾 已下載 HTML 檔案！', 'success');
    }

    function handleHashRoute() {
      const h = window.location.hash || '';
      if (h.startsWith('#/vendor/')) {
        const token = h.replace('#/vendor/', '').trim();
        const found = defects.find(d => d.magicToken === token || d.id === token);
        switchMainTab('vendor');
        if (found) {
          selectVendorTicket(found.id);
        }
      }
    }

    window.addEventListener('hashchange', handleHashRoute);


    // ====================================================
    // 8. Tri-Party Electronic Signature Boxes & Handwritten Signature Pad
    // ====================================================
    function buildTriPartySignatureBoxesHtml(d, ticketId) {
      const tidArg = ticketId ? `'${ticketId}'` : 'null';

      const inspSigned = d ? Boolean(d.signInspector || d.signInspectorImg) : draftSignatures.inspector.signed;
      const inspName = d ? (d.signInspectorName || d.inspectorName || currentInspectorName) : (draftSignatures.inspector.name || currentInspectorName);
      const inspTime = d ? (d.signInspectorTime || d.createdAt || '2026-10-22 10:13') : (draftSignatures.inspector.time || '2026-10-22 10:13');
      const inspImg = d ? (d.signInspectorImg || generateStylizedSignatureDataUrl(inspName, true)) : (draftSignatures.inspector.img || generateStylizedSignatureDataUrl(inspName, true));

      const vendSigned = d ? Boolean(d.signVendor && d.signVendorImg) : Boolean(draftSignatures.vendor.signed && draftSignatures.vendor.img);
      const vendName = d ? (d.signVendorName || d.vendor || '宏昇水電工程') : (draftSignatures.vendor.name || '宏昇水電工程');
      const vendTime = d ? (d.signVendorTime || '') : (draftSignatures.vendor.time || '');
      const vendImg = d ? (d.signVendorImg || '') : (draftSignatures.vendor.img || '');

      const mgrSigned = d ? Boolean((d.signManager && d.signManagerImg) || d.status === 'CLOSED') : Boolean(draftSignatures.manager.signed && draftSignatures.manager.img);
      const mgrName = d ? (d.signManagerName || '工地主任 / 所長') : (draftSignatures.manager.name || '工地主任 / 所長');
      const mgrTime = d ? (d.signManagerTime || d.closedAt || '') : (draftSignatures.manager.time || '');
      const mgrImg = d ? (d.signManagerImg || (d.status === 'CLOSED' ? generateStylizedSignatureDataUrl('工地主任', true) : '')) : (draftSignatures.manager.img || '');

      return `
        <!-- Box 1: 查驗工程師簽章 -->
        <div onclick="openSignaturePadModal('inspector', ${tidArg})" class="cursor-pointer rounded-xl bg-white hover:bg-amber-50/40 border border-slate-300 hover:border-amber-500 p-2.5 flex flex-col justify-between transition shadow-sm">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-extrabold text-slate-800">查驗工程師簽章：</span>
            <span class="text-amber-700 font-bold">✍️ 簽名/重簽</span>
          </div>
          <div class="h-14 my-1 flex items-center justify-center overflow-hidden">
            ${inspSigned && inspImg
              ? `<img src="${inspImg}" alt="查驗工程師簽章" class="max-h-14 w-auto object-contain" />`
              : `<span class="text-xs text-slate-400 font-semibold">(點擊工程師簽章)</span>`
            }
          </div>
          <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span class="font-extrabold text-slate-900 truncate">${inspName}</span>
            <span class="mono text-[10px] text-slate-500">${inspSigned ? inspTime : '(待簽章)'}</span>
          </div>
        </div>

        <!-- Box 2: 協力廠商簽認 -->
        <div onclick="openSignaturePadModal('vendor', ${tidArg})" class="cursor-pointer rounded-xl bg-white hover:bg-amber-50/40 border border-slate-300 hover:border-amber-500 p-2.5 flex flex-col justify-between transition shadow-sm">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-extrabold text-slate-800">協力廠商簽認：</span>
            <span class="text-amber-700 font-bold">✍️ 簽名/重簽</span>
          </div>
          <div class="h-14 my-1 flex items-center justify-center overflow-hidden">
            ${vendSigned && vendImg
              ? `<img src="${vendImg}" alt="協力廠商簽認" class="max-h-14 w-auto object-contain" />`
              : `<span class="text-xs text-slate-400 font-semibold">(點擊廠商簽章)</span>`
            }
          </div>
          <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span class="font-extrabold text-slate-900 truncate">${vendName}</span>
            <span class="mono text-[10px] text-slate-500">${vendSigned ? (vendTime || '已簽認') : '(待簽認)'}</span>
          </div>
        </div>

        <!-- Box 3: 工地主任／主管覆核 -->
        <div onclick="openSignaturePadModal('manager', ${tidArg})" class="cursor-pointer rounded-xl bg-white hover:bg-amber-50/40 border border-slate-300 hover:border-amber-500 p-2.5 flex flex-col justify-between transition shadow-sm">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-extrabold text-slate-800">工地主任／主管覆核：</span>
            <span class="text-amber-700 font-bold">✍️ 簽名/結案</span>
          </div>
          <div class="h-14 my-1 flex items-center justify-center overflow-hidden">
            ${mgrSigned && mgrImg
              ? `<img src="${mgrImg}" alt="工地主任覆核簽章" class="max-h-14 w-auto object-contain" />`
              : `<span class="text-xs text-slate-400 font-semibold">工地主任 複驗合格結案</span>`
            }
          </div>
          <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span class="font-extrabold text-slate-900 truncate">${mgrName}</span>
            <span class="mono text-[10px] text-slate-500">${mgrSigned ? (mgrTime || '已覆核') : '(待覆核)'}</span>
          </div>
        </div>
      `;
    }

    function renderStep4TriSignatureGrid() {
      const grid = document.getElementById('step4-tri-signature-grid');
      if (!grid) return;
      const activeTicket = defects.find(item => item.id === currentVendorTicketId) || null;
      grid.innerHTML = buildTriPartySignatureBoxesHtml(activeTicket, activeTicket ? activeTicket.id : null);
      const codeEl = document.getElementById('line-card-report-code');
      if (codeEl) {
        codeEl.textContent = '產出編號：' + (activeTicket ? (activeTicket.reportCode || activeTicket.id) : draftSignatures.reportCode);
      }
    }

    function initSignaturePadCanvasEvents() {
      const canvas = document.getElementById('sig-pad-canvas');
      if (!canvas) return;

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      }

      function start(e) {
        e.preventDefault();
        isSigPadDrawing = true;
        const p = getPos(e);
        currentSigStroke = [p];
      }

      function move(e) {
        if (!isSigPadDrawing) return;
        e.preventDefault();
        const p = getPos(e);
        currentSigStroke.push(p);
        redrawSignaturePadWithStamp();
      }

      function end(e) {
        if (!isSigPadDrawing) return;
        isSigPadDrawing = false;
        if (currentSigStroke.length > 0) {
          sigPadStrokes.push(currentSigStroke.slice());
          currentSigStroke = [];
        }
        redrawSignaturePadWithStamp();
      }

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', end);
    }

    function openSignaturePadModal(role, ticketId) {
      activeSigRole = role || 'inspector';
      activeSigTicketId = ticketId || (defects.length > 0 ? defects[0].id : null);
      const modal = document.getElementById('signature-pad-modal');
      if (modal) modal.classList.remove('hidden');
      switchSignatureRole(activeSigRole);
    }

    function closeSignaturePadModal() {
      const modal = document.getElementById('signature-pad-modal');
      if (modal) modal.classList.add('hidden');
    }

    function switchSignatureRole(role) {
      activeSigRole = role;
      ['inspector', 'vendor', 'manager'].forEach(r => {
        const btn = document.getElementById('sig-role-btn-' + r);
        if (!btn) return;
        if (r === role) {
          btn.className = 'py-1.5 px-1 rounded-lg font-bold bg-amber-500 text-slate-950 transition truncate shadow';
        } else {
          btn.className = 'py-1.5 px-1 rounded-lg font-medium text-slate-400 hover:text-white transition truncate';
        }
      });

      const d = activeSigTicketId ? defects.find(item => item.id === activeSigTicketId) : null;
      const nameInput = document.getElementById('sig-signer-name-input');
      if (nameInput) {
        if (role === 'inspector') {
          nameInput.value = (d && d.signInspectorName) ? d.signInspectorName : currentInspectorName;
        } else if (role === 'vendor') {
          nameInput.value = (d && (d.signVendorName || d.vendor)) ? (d.signVendorName || d.vendor) : (draftSignatures.vendor.name || '宏昇水電工程');
        } else {
          nameInput.value = (d && d.signManagerName) ? d.signManagerName : '工地主任 / 所長';
        }
      }
      sigPadStrokes = [];
      currentSigStroke = [];
      drawAutoHandwrittenSignature();
    }

    function clearSignaturePadCanvas() {
      sigPadStrokes = [];
      currentSigStroke = [];
      autoGeneratedNameOnPad = '';
      redrawSignaturePadWithStamp();
    }

    let autoGeneratedNameOnPad = '';

    function drawAutoHandwrittenSignature() {
      const nameInput = document.getElementById('sig-signer-name-input');
      autoGeneratedNameOnPad = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : currentInspectorName;
      sigPadStrokes = [];
      currentSigStroke = [];
      redrawSignaturePadWithStamp();
    }

    function redrawSignaturePadWithStamp() {
      const canvas = document.getElementById('sig-pad-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle signature baseline
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(24, 112);
      ctx.lineTo(canvas.width - 24, 112);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw auto-generated stylized signature if active and no manual strokes yet
      if (autoGeneratedNameOnPad && sigPadStrokes.length === 0 && currentSigStroke.length === 0) {
        ctx.save();
        ctx.strokeStyle = '#0f172a';
        ctx.fillStyle = '#0f172a';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.translate(45, 78);
        ctx.rotate(-0.04);
        ctx.font = 'italic bold 32px "Noto Sans TC", "Inter", serif';
        ctx.fillText(autoGeneratedNameOnPad, 22, 0);

        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.bezierCurveTo(45, -16, 95, 16, 145, -8);
        ctx.bezierCurveTo(180, -22, 210, 12, 250, 3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(10, 20);
        ctx.quadraticCurveTo(130, 12, 255, 18);
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
      }

      // Draw user's manual strokes
      const allStrokes = currentSigStroke.length > 0 ? [...sigPadStrokes, currentSigStroke] : sigPadStrokes;
      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      allStrokes.forEach(stroke => {
        if (!stroke || stroke.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      });
      ctx.restore();

      const stampChk = document.getElementById('sig-stamp-checkbox');
      if (!stampChk || stampChk.checked) {
        drawRedElectronicStampOnCtx(ctx, 318, 36, 68, 68);
      }
    }

    function saveSignatureFromPad() {
      const canvas = document.getElementById('sig-pad-canvas');
      if (!canvas) return;
      const nameInput = document.getElementById('sig-signer-name-input');
      const signerName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : '已簽署';
      const stampChk = document.getElementById('sig-stamp-checkbox');
      const withStamp = !stampChk || stampChk.checked;

      // If canvas is blank, generate stylized signature for signerName
      let dataUrl = '';
      if (sigPadStrokes.length === 0 && !autoGeneratedNameOnPad) {
        dataUrl = generateStylizedSignatureDataUrl(signerName, withStamp);
      } else {
        dataUrl = canvas.toDataURL('image/png');
      }

      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const d = activeSigTicketId ? defects.find(item => item.id === activeSigTicketId) : null;

      if (activeSigRole === 'inspector') {
        currentInspectorName = signerName;
        draftSignatures.inspector = { signed: true, name: signerName, time: nowStr, img: dataUrl };
        if (d) {
          d.inspectorName = signerName;
          d.signInspector = true;
          d.signInspectorName = signerName;
          d.signInspectorTime = nowStr;
          d.signInspectorImg = dataUrl;
        }
        syncProjectAndInspectorUI();
      } else if (activeSigRole === 'vendor') {
        draftSignatures.vendor = { signed: true, name: signerName, time: nowStr, img: dataUrl };
        if (d) {
          d.vendor = signerName;
          d.signVendor = true;
          d.signVendorName = signerName;
          d.signVendorTime = nowStr;
          d.signVendorImg = dataUrl;
        }
      } else if (activeSigRole === 'manager') {
        draftSignatures.manager = { signed: true, name: signerName, time: nowStr, img: dataUrl };
        if (d) {
          d.signManager = true;
          d.signManagerName = signerName;
          d.signManagerTime = nowStr;
          d.signManagerImg = dataUrl;
          d.status = 'CLOSED';
          d.closedAt = nowStr;
        }
      }

      saveDefectsToStorage();
      renderStep4TriSignatureGrid();
      renderAdminBoard();
      const pdfGrid = document.getElementById('pdf-tri-signature-grid');
      if (pdfGrid) {
        pdfGrid.innerHTML = buildTriPartySignatureBoxesHtml(d, d ? d.id : null);
      }
      closeSignaturePadModal();
      showToast(`✍️ 已完成「${signerName}」手寫電子簽章覆核！`, 'success');
    }

    function clearAndRemoveRoleSignature() {
      const d = activeSigTicketId ? defects.find(item => item.id === activeSigTicketId) : null;
      if (activeSigRole === 'inspector') {
        draftSignatures.inspector.signed = false;
        draftSignatures.inspector.img = '';
        if (d) { d.signInspector = false; d.signInspectorImg = ''; d.signInspectorTime = ''; }
      } else if (activeSigRole === 'vendor') {
        draftSignatures.vendor.signed = false;
        draftSignatures.vendor.img = '';
        if (d) { d.signVendor = false; d.signVendorImg = ''; d.signVendorTime = ''; }
      } else if (activeSigRole === 'manager') {
        draftSignatures.manager.signed = false;
        draftSignatures.manager.img = '';
        if (d) { d.signManager = false; d.signManagerImg = ''; d.signManagerTime = ''; }
      }
      saveDefectsToStorage();
      renderStep4TriSignatureGrid();
      renderAdminBoard();
      closeSignaturePadModal();
      showToast('🔄 已將該欄位重設為「待簽認」狀態', 'info');
    }

    window.onload = function() {
      window.vendorSubmitCompletion = vendorSubmitCompletion;
      window.submitPwaDefect = submitPwaDefect;
      window.retakePwaPhoto = retakePwaPhoto;
      window.beginRetakeDispatchedPhoto = beginRetakeDispatchedPhoto;
      initProjectMeta();
      defects = [];
      currentVendorTicketId = null;
      initCanvas();
      updatePwaPhotoUi();
      initVendorAfterCanvas();
      initSignaturePadCanvasEvents();
      setCloudSyncBadge('loading');
      refreshDefectsUi();

      loadDefectsFromSupabase().then(() => {
        refreshDefectsUi();
        setCloudSyncBadge('cloud', defects.length);
        showToast('☁️ 已從雲端載入 ' + defects.length + ' 筆缺失單', 'success');
      }).catch((err) => {
        console.error(err);
        loadLocalDefectsCache();
        refreshDefectsUi();
        setCloudSyncBadge('offline');
        showToast('⚠️ 雲端載入失敗，改用本機備援：' + (err.message || err), 'error');
      });

      ['pwa-building', 'pwa-floor', 'pwa-area', 'pwa-note', 'pwa-action-note', 'pwa-vendor', 'pwa-sla'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateLiveLinePreviewText);
          el.addEventListener('change', updateLiveLinePreviewText);
        }
      });
    };

    // ====================================================
    // 雲端同步：照片 → R2（presigned URL 直傳），缺失紀錄 → D1
    // 本機 localStorage 仍保留（原系統依賴它）；雲端失敗時照片以本機資料保存
    // ====================================================
    function cloudEscape(v) {
      return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function canvasToJpegBlob(canvas, quality) {
      return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality || 0.82));
    }

    async function uploadPhotoViaServer(blob, site, date, filename) {
      const contentType = blob.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const qs = new URLSearchParams({ site: site || '', date: date || '', filename: filename || '' });
      const res = await fetch('/api/photos/upload?' + qs, { method: 'POST', headers: { 'Content-Type': contentType }, body: blob });
      const r = await res.json().catch(() => ({}));
      if (!res.ok || !r.photoUrl) throw new Error(r.error || ('HTTP ' + res.status));
      return r.photoUrl;
    }

    async function uploadPhotoToR2(blob, site, date, filename) {
      const contentType = blob.type || 'image/jpeg';
      let firstErr;
      try {
        const pres = await fetch('/api/photos/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: filename || 'photo.jpg', contentType, site, date, size: blob.size })
        });
        if (!pres.ok) throw new Error('取得上傳網址失敗：' + (await pres.text()));
        const { uploadUrl, photoUrl } = await pres.json();
        const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
        if (!put.ok) throw new Error('照片上傳 R2 失敗 (' + put.status + ')');
        return photoUrl;
      } catch (err) {
        firstErr = err;
      }
      // 後備：同源伺服器直接寫入 R2（JPEG/PNG、5MB 內）
      try {
        return await uploadPhotoViaServer(blob, site, date, filename);
      } catch (err2) {
        throw new Error((firstErr ? firstErr.message + '；' : '') + '後備上傳失敗：' + err2.message);
      }
    }

    // 把 data: URL 照片轉成 JPEG blob（長邊最多 1600px，盡量壓在 1MB 內供 LINE 顯示）
    function blobToDataUrl(blob) {
      return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('照片讀取失敗')); r.readAsDataURL(blob); });
    }

    // 取得缺失單的照片來源（各欄位都試）
    function defectPhotoSrc(d) {
      return [d.photoUrl, d.beforeImg, d.annotatedImg, d.photo, d.image].map((x) => String(x || '')).find((x) => /^(data:image|blob:|https?:|\/api\/photos\/)/.test(x)) || '';
    }

    function dataUrlToJpegBlob(dataUrl) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
          const max = 1600;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          let q = 0.82, b = await canvasToJpegBlob(c, q);
          while (b && b.size > 1000000 && q > 0.4) { q -= 0.12; b = await canvasToJpegBlob(c, q); }
          b ? resolve(b) : reject(new Error('照片轉檔失敗'));
        };
        img.onerror = () => reject(new Error('照片讀取失敗'));
        if (/^https?:/.test(dataUrl) && !dataUrl.startsWith(location.origin)) img.crossOrigin = 'anonymous';
        img.src = dataUrl;
      });
    }

    async function syncDefectToCloud(d, canvas) {
      const date = String(d.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      const site = d.projectName || currentProjectName;
      let photoUrl = null;
      if (canvas) {
        const blob = await canvasToJpegBlob(canvas, 0.82);
        if (blob) photoUrl = await uploadPhotoToR2(blob, site, date, d.id + '.jpg');
      }
      const res = await fetch('/api/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: d.id, report_code: d.reportCode, site, date,
          inspector: d.inspectorName, building: d.building, floor: d.floor, area: d.area,
          trade: d.trade, severity: d.severity, vendor: d.vendor, description: d.description,
          action_note: d.actionNote, status: d.status, due_date: d.dueDate, photo_url: photoUrl
        })
      });
      if (!res.ok) throw new Error('缺失紀錄寫入 D1 失敗：' + (await res.text()));
      return photoUrl;
    }

    // 派單已改為直接寫入 Supabase Storage + defects 資料表，不再改包去 R2/D1。

    function openPhotoQueryModal() {
      const m = document.getElementById('photo-query-modal');
      const siteEl = document.getElementById('photo-query-site');
      if (siteEl && !siteEl.value) siteEl.value = currentProjectName;
      if (m) m.classList.remove('hidden');
      runPhotoQuery();
    }

    function closePhotoQueryModal() {
      const m = document.getElementById('photo-query-modal');
      if (m) m.classList.add('hidden');
    }

    async function runPhotoQuery() {
      const site = (document.getElementById('photo-query-site').value || '').trim();
      const date = document.getElementById('photo-query-date').value || '';
      const status = document.getElementById('photo-query-status');
      const box = document.getElementById('photo-query-results');
      status.textContent = '查詢中…';
      box.innerHTML = '';
      try {
        const qs = new URLSearchParams();
        if (site) qs.set('site', site);
        if (date) qs.set('date', date);
        const res = await fetch('/api/photos-list?' + qs.toString());
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const dl = document.getElementById('photo-query-site-list');
        if (dl && Array.isArray(data.sites)) dl.innerHTML = data.sites.map((s) => `<option value="${cloudEscape(s)}"></option>`).join('');
        const items = data.items || [];
        status.textContent = items.length ? `共 ${items.length} 張照片` : '找不到符合條件的照片';
        box.innerHTML = items.map((it) => `
          <a href="${cloudEscape(it.photo_url)}" target="_blank" rel="noopener" class="block rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-sky-500 transition">
            <img src="${cloudEscape(it.photo_url)}" alt="缺失照片" loading="lazy" class="w-full aspect-[4/3] object-cover" />
            <div class="px-1.5 py-1 text-[10px] leading-tight space-y-0.5">
              <div class="mono text-amber-400 font-bold truncate">#${cloudEscape(it.id)}</div>
              <div class="text-slate-300 truncate">📍 ${cloudEscape([it.building, it.floor, it.area].filter(Boolean).join('-'))}</div>
              <div class="text-slate-500 truncate">${cloudEscape(it.site)}｜${cloudEscape(it.date)}</div>
            </div>
          </a>`).join('');
      } catch (err) {
        status.textContent = '⚠️ 查詢失敗：' + err.message;
      }
    }

