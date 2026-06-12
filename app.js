// ─── STATE ───────────────────────────────────────────────────────────────────
let state = {
  currentPage: 'general',   // 'general' | 'setup' | 'mentors' | 'between' | 'lesson_N'
  currentTab: 'before',
  studentsCount: 25,
  lessons: {},               // { 1: lessonData, ... }
  general: null,
  searchOpen: false,
};

// ─── THEME ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = theme === 'light' ? '🌙 כהה' : '☀️ בהיר';
}

function toggleTheme() {
  const current = localStorage.getItem('theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  applyTheme(localStorage.getItem('theme') || 'dark');
  // Load global students count
  state.studentsCount = parseInt(localStorage.getItem('students_count') || '25');

  // Load general data
  state.general = await fetchJSON('data/general.json');
  if (state.general) {
    state.studentsCount = parseInt(localStorage.getItem('students_count') || state.general.workshop.students_count || '25');
  }

  // Load all lessons
  for (let i = 1; i <= 10; i++) {
    const data = await fetchJSON(`data/lesson_${String(i).padStart(2,'0')}.json`);
    if (data) state.lessons[i] = data;
  }

  renderSidebar();
  navigateTo('general');
  setupSearch();
}

async function fetchJSON(path) {
  // On file:// protocol, fetch is blocked by CORS — use embedded data if available
  if (location.protocol === 'file:' && window.__STATIC_DATA__) {
    const key = path.replace('data/', '').replace('.json', '');
    return window.__STATIC_DATA__[key] || null;
  }
  try {
    const r = await fetch(path);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  const colorMap = { purple:'#7B4FD4', blue:'#29A8E0', pink:'#E83B8C', teal:'#2DC4B0', green:'#52D44A' };

  let html = `
    <div class="sidebar-section">
      <div class="sidebar-section-label">כללי</div>
      ${navItem('general', '🏠', 'מידע כללי')}
      ${navItem('setup_page', '⚙️', 'הקמת הסדנה')}
      ${navItem('mentors', '📋', 'דגשים למנטורים')}
    </div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">שיעורים</div>`;

  for (let i = 1; i <= 10; i++) {
    const lesson = state.lessons[i];
    const title = lesson ? lesson.title : `שיעור ${i}`;
    const color = lesson ? (colorMap[lesson.color] || colorMap.purple) : colorMap.purple;
    const progress = getLessonProgress(i);
    html += `
      <div class="nav-item ${state.currentPage === `lesson_${i}` ? 'active' : ''}"
           onclick="navigateTo('lesson_${i}')"
           id="nav-lesson-${i}">
        <span class="lesson-color-dot" style="background:${color}"></span>
        <span>שיעור ${i}${lesson && lesson.title ? ' - ' + lesson.title.slice(0,14) : ''}</span>
        ${progress.total > 0 ? `<span class="progress-badge">${progress.done}/${progress.total}</span>` : ''}
      </div>`;
  }

  html += `
    </div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section">
      ${navItem('between', '🔄', 'מה קורה בין המפגשים?')}
    </div>`;

  nav.innerHTML = html;
}

function navItem(page, icon, label) {
  return `<div class="nav-item ${state.currentPage === page ? 'active' : ''}" onclick="navigateTo('${page}')">
    <span class="nav-icon">${icon}</span>
    <span>${label}</span>
  </div>`;
}

function getLessonProgress(num) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(`lesson_${num}_`));
  const done = keys.filter(k => localStorage.getItem(k) === 'true').length;
  return { done, total: keys.length };
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigateTo(page) {
  state.currentPage = page;
  state.currentTab = 'before';
  renderSidebar();

  const content = document.getElementById('page-content');

  if (page === 'general') renderGeneralPage(content);
  else if (page === 'setup_page') renderSetupPage(content);
  else if (page === 'mentors') renderMentorsPage(content);
  else if (page === 'between') renderBetweenPage(content);
  else if (page.startsWith('lesson_')) {
    const num = parseInt(page.replace('lesson_', ''));
    renderLessonPage(content, num);
  }

  window.scrollTo(0, 0);
}

// ─── LESSON PAGE ──────────────────────────────────────────────────────────────
function renderLessonPage(container, num) {
  const lesson = state.lessons[num];
  if (!lesson) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">נתוני שיעור ${num} לא נמצאו</div></div>`;
    return;
  }

  const colorMap = { purple:'#7B4FD4', blue:'#29A8E0', pink:'#E83B8C', teal:'#2DC4B0', green:'#52D44A' };
  const color = colorMap[lesson.color] || colorMap.purple;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">
        <div class="lesson-color-bar" style="background:${color}"></div>
        שיעור ${num} — ${lesson.title}
      </div>
      ${lesson.subtitle ? `<div class="page-subtitle">${lesson.subtitle}</div>` : ''}
    </div>
    <div class="students-bar">
      <span class="students-label">מספר תלמידים:</span>
      <input type="number" class="students-input" id="students-input-${num}"
             value="${state.studentsCount}" min="1" max="200"
             onchange="updateStudentsCount(this.value)">
      <span class="students-label" style="color:var(--text3)">כל הכמויות מחושבות לפי מספר זה</span>
    </div>
    <div class="tabs" id="lesson-tabs">
      ${tabBtn('before', '📋 לפני השיעור', num)}
      ${tabBtn('setup', '🏗️ הגעה ותפעול', num)}
      ${tabBtn('during', '🎯 במהלך השיעור', num)}
      ${tabBtn('after', '✅ אחרי השיעור', num)}
      ${tabBtn('files', '📁 קישורים וקבצים', num)}
    </div>
    <div id="lesson-tab-content"></div>
  `;

  renderLessonTab(num, 'before');
}

function tabBtn(tab, label, num) {
  const active = state.currentTab === tab ? 'active' : '';
  return `<button class="tab-btn ${active}" onclick="switchTab(${num}, '${tab}')">${label}</button>`;
}

function switchTab(num, tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  renderLessonTab(num, tab);
}

function renderLessonTab(num, tab) {
  const lesson = state.lessons[num];
  const container = document.getElementById('lesson-tab-content');
  if (!container) return;

  if (tab === 'before') renderTabBefore(container, lesson, num);
  else if (tab === 'setup') renderTabSetup(container, lesson, num);
  else if (tab === 'during') renderTabDuring(container, lesson, num);
  else if (tab === 'after') renderTabAfter(container, lesson, num);
  else if (tab === 'files') renderTabFiles(container, lesson, num);
}

// ─── TAB: BEFORE ─────────────────────────────────────────────────────────────
function renderTabBefore(container, lesson, num) {
  const b = lesson.before;
  container.innerHTML = `
    ${renderSection('בדיקות מראש', renderChecklist(b.preparations, num, 'prep'))}
    ${renderSection('מה לרכוש / להכין', renderPurchases(b.purchases, num))}
    ${renderSection('דפי עבודה להדפסה', renderPrintMaterials(b.print_materials, num))}
  `;
  loadCheckboxStates(num);
}

function renderChecklist(items, num, prefix) {
  if (!items || !items.length) return '<div class="empty-state" style="padding:20px"><div class="empty-state-text">אין פריטים</div></div>';
  return `<ul class="checklist">${items.map(item => {
    const key = `lesson_${num}_${prefix}_${item.id}`;
    const done = localStorage.getItem(key) === 'true';
    return `
      <li class="check-item ${done ? 'done' : ''}" id="ci-${key}">
        <input type="checkbox" id="cb-${key}" ${done ? 'checked' : ''}
               onchange="toggleCheck('${key}', this.checked)">
        <div style="flex:1">
          <label class="check-label" for="cb-${key}">${item.text}</label>
          ${item.note ? `
            <button class="check-note-btn" onclick="toggleNote('note-${key}')">💡</button>
            <div class="check-note-content" id="note-${key}">${item.note}</div>` : ''}
        </div>
      </li>`;
  }).join('')}</ul>`;
}

function renderPurchases(items, num) {
  if (!items || !items.length) return '<div class="empty-state" style="padding:20px"><div class="empty-state-text">אין רכישות לשיעור זה</div></div>';
  return `<ul class="checklist">${items.map(item => {
    const key = `lesson_${num}_buy_${item.id}`;
    const done = localStorage.getItem(key) === 'true';
    const qty = calcQuantity(item.quantity_formula);
    return `
      <li class="check-item ${done ? 'done' : ''}" id="ci-${key}">
        <input type="checkbox" id="cb-${key}" ${done ? 'checked' : ''}
               onchange="toggleCheck('${key}', this.checked)">
        <div style="flex:1">
          <label class="check-label" for="cb-${key}">${item.text}</label>
          ${item.supplier ? `<div style="font-size:12px;color:var(--text3);margin-top:3px">🏪 ${item.supplier}${item.phone ? ' · ' + item.phone : ''}</div>` : ''}
          ${item.note ? `<div style="font-size:12px;color:var(--text2);margin-top:3px">💡 ${item.note}</div>` : ''}
        </div>
        <span class="check-quantity">${qty}</span>
      </li>`;
  }).join('')}</ul>`;
}

function renderPrintMaterials(items, num) {
  if (!items || !items.length) return '<div class="empty-state" style="padding:20px"><div class="empty-state-text">אין חומרי הדפסה לשיעור זה</div></div>';
  return items.map(item => {
    const qty = calcQuantity(item.quantity_formula);
    const approvedKey = `lesson_${num}_print_approved_${item.id}`;
    const isApproved = localStorage.getItem(approvedKey) === 'true';
    return `
      <div class="print-item">
        <span style="font-size:18px">📄</span>
        <div class="file-meta" style="flex:1">
          <div class="file-name">${item.name}</div>
          <div class="file-desc">כמות: ${qty} עותקים</div>
        </div>
        ${item.drive_link ? `<a href="${item.drive_link}" target="_blank" class="btn btn-ghost btn-sm">⬇️ הורדה</a>` : ''}
        <button class="print-approved-btn ${isApproved ? '' : 'pending'}"
                onclick="togglePrintApproval('${approvedKey}', this)">
          ${isApproved ? '✓ נשלח לאייל' : 'שלח אישור לאייל'}
        </button>
      </div>`;
  }).join('');
}

// ─── TAB: SETUP ──────────────────────────────────────────────────────────────
function renderTabSetup(container, lesson, num) {
  const s = lesson.setup;
  const zoomKey = `lesson_${num}_zoom_link`;
  const savedZoom = localStorage.getItem(zoomKey) || s.zoom_link || '';

  container.innerHTML = `
    ${renderSection('סידור המתחם', renderChecklistItems(s.venue_checklist, num, 'venue'))}
    ${renderSection('ציוד טכני', `
      ${renderChecklistItems(s.technical_checklist, num, 'tech')}
      <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <div style="font-size:12px;color:var(--text3);margin-bottom:6px">קישור זום לשיעור</div>
        <div class="link-field-wrap">
          <input type="text" class="link-input" placeholder="הכנס קישור זום כאן..."
                 value="${savedZoom}"
                 onchange="saveLinkField('${zoomKey}', this.value)"
                 id="zoom-link-${num}">
          ${savedZoom ? `<a href="${savedZoom}" target="_blank" class="btn btn-ghost btn-sm">פתח</a>` : ''}
        </div>
      </div>
    `)}
    ${renderSection('מוזיקה', renderPlaylists(s.music_playlists))}
  `;
  loadCheckboxStates(num);
}

function renderChecklistItems(items, num, prefix) {
  if (!items || !items.length) return '';
  return `<ul class="checklist">${items.map(item => {
    const key = `lesson_${num}_${prefix}_${item.id}`;
    const done = localStorage.getItem(key) === 'true';
    return `
      <li class="check-item ${done ? 'done' : ''}" id="ci-${key}">
        <input type="checkbox" id="cb-${key}" ${done ? 'checked' : ''}
               onchange="toggleCheck('${key}', this.checked)">
        <label class="check-label" for="cb-${key}">${item.text}</label>
      </li>`;
  }).join('')}</ul>`;
}

function renderPlaylists(items) {
  if (!items || !items.length) return '';
  const icons = { 'כתיבה': '📝', 'אנרגטית': '⚡', 'חיובית': '⚡', 'אנרגטית / חיובית': '⚡', 'הקפצה': '🔥' };
  return items.map(item => `
    <div class="playlist-item">
      <span class="playlist-icon">${icons[item.type] || '🎵'}</span>
      <div style="flex:1">
        <div class="playlist-name">${item.name}</div>
        <div class="playlist-type">${item.type}</div>
      </div>
      ${item.link ? `<a href="${item.link}" target="_blank" class="btn btn-ghost btn-sm">▶ פתח</a>` : '<span style="font-size:12px;color:var(--text3)">ללא קישור</span>'}
    </div>`).join('');
}

// ─── TAB: DURING ─────────────────────────────────────────────────────────────
function renderTabDuring(container, lesson, num) {
  const d = lesson.during;
  const colorMap = { purple:'#7B4FD4', blue:'#29A8E0', pink:'#E83B8C', teal:'#2DC4B0', green:'#52D44A' };
  const color = colorMap[lesson.color] || colorMap.purple;

  const stagesHtml = (d.stages || []).map((stage, idx) => `
    <div class="stage-item" id="stage-${num}-${idx}">
      <div class="stage-header" onclick="toggleStage('stage-${num}-${idx}')">
        <div class="stage-num" style="background:rgba(${hexToRgb(color)},0.15);color:${color}">${idx+1}</div>
        <div class="stage-title">${stage.title}</div>
        <div class="stage-duration">⏱ ${stage.duration_minutes} דק'</div>
        <div class="stage-chevron">▼</div>
      </div>
      <div class="stage-body">
        <div class="stage-desc">${stage.description}</div>
        ${stage.nuances && stage.nuances.length ? `
          <div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px;margin-top:10px">תרחישים ודגשים:</div>
          <ul class="nuances-list">
            ${stage.nuances.map(n => `
              <li class="nuance-item">
                <div class="nuance-trigger">📌 ${n.trigger}</div>
                <div class="nuance-response">${n.response}</div>
              </li>`).join('')}
          </ul>` : ''}
      </div>
    </div>`).join('');

  const specialNotes = (d.special_notes || []).map(n => `
    <div style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
      <span>⚡</span>
      <span style="font-size:13.5px;color:var(--text1)">${n}</span>
    </div>`).join('');

  container.innerHTML = `
    ${renderSection('מבנה השיעור', stagesHtml || '<div class="empty-state" style="padding:20px"><div class="empty-state-text">לא הוגדרו שלבים</div></div>')}
    ${d.special_notes && d.special_notes.length ? renderSection('דגשים ספציפיים לשיעור זה', specialNotes) : ''}
    ${renderSection('נקודות חשובות לפתיחה', (d.opening_notes || []).map(n => `
      <div style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
        <span>💡</span>
        <span style="font-size:13.5px;color:var(--text1)">${n}</span>
      </div>`).join(''))}
  `;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `${r},${g},${b}`;
}

function toggleStage(id) {
  document.getElementById(id).classList.toggle('open');
}

// ─── TAB: AFTER ──────────────────────────────────────────────────────────────
function renderTabAfter(container, lesson, num) {
  const a = lesson.after;
  const recLinkKey = `lesson_${num}_recording_link`;
  const webLinkKey = `lesson_${num}_website_lesson_link`;

  container.innerHTML = `
    ${renderSection('הודעות WhatsApp לשליחה', renderWAMessages(a.whatsapp_messages))}
    ${renderSection('עריכת הקלטה', `
      ${renderChecklistItems(a.recording_checklist, num, 'rec')}
      <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <div style="font-size:12px;color:var(--text3);margin-bottom:6px">קישור להקלטה המוכנה</div>
        <div class="link-field-wrap">
          <input type="text" class="link-input" placeholder="קישור להקלטה..."
                 value="${localStorage.getItem(recLinkKey) || ''}"
                 onchange="saveLinkField('${recLinkKey}', this.value)">
        </div>
      </div>
    `)}
    ${renderSection('פתיחת שיעור באתר החברים', `
      ${renderChecklistItems(a.website_unlock_checklist, num, 'web')}
      <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <div style="font-size:12px;color:var(--text3);margin-bottom:6px">קישור לשיעור באתר</div>
        <div class="link-field-wrap">
          <input type="text" class="link-input" placeholder="קישור לשיעור באתר..."
                 value="${localStorage.getItem(webLinkKey) || ''}"
                 onchange="saveLinkField('${webLinkKey}', this.value)">
        </div>
      </div>
    `)}
    ${renderSection('שליחת תמונות לווצאפ', renderPhotosToSend(a.photos_to_send, num))}
    ${renderSection('סגירה כללית', renderChecklistItems(a.closing_checklist, num, 'close'))}
  `;
  loadCheckboxStates(num);
}

function renderWAMessages(messages) {
  if (!messages || !messages.length) return '<div class="empty-state" style="padding:20px"><div class="empty-state-text">אין הודעות</div></div>';
  return messages.map(msg => `
    <div class="wa-message">
      <div class="wa-header">
        <span class="wa-icon">💬</span>
        <div class="wa-meta">
          <div class="wa-name">${msg.name}</div>
          <div class="wa-recipient">📍 ${msg.recipient}</div>
        </div>
      </div>
      <div class="wa-text" id="wa-text-${msg.id}">${escapeHtml(msg.text)}</div>
      <div class="wa-footer">
        <button class="btn-copy" id="copy-${msg.id}" onclick="copyMessage('${msg.id}', ${JSON.stringify(msg.text)})">
          📋 העתק
        </button>
        ${msg.attachments && msg.attachments.length ? `
          <span style="font-size:12px;color:var(--text3)">
            📎 ${msg.attachments.join(' · ')}
          </span>` : ''}
      </div>
    </div>`).join('');
}

function renderPhotosToSend(photos, num) {
  if (!photos || !photos.length) return '<div class="empty-state" style="padding:20px"><div class="empty-state-text">אין תמונות</div></div>';
  return `<ul class="checklist">${photos.map(photo => {
    const key = `lesson_${num}_photo_${photo.id}`;
    const done = localStorage.getItem(key) === 'true';
    return `
      <li class="check-item ${done ? 'done' : ''}" id="ci-${key}">
        <input type="checkbox" id="cb-${key}" ${done ? 'checked' : ''}
               onchange="toggleCheck('${key}', this.checked)">
        <div style="flex:1">
          <label class="check-label" for="cb-${key}">${photo.text}</label>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">📍 ${photo.recipient}</div>
        </div>
      </li>`;
  }).join('')}</ul>`;
}

// ─── TAB: FILES ──────────────────────────────────────────────────────────────
function renderTabFiles(container, lesson, num) {
  const f = lesson.files;
  const recLinkKey = `lesson_${num}_recording_link`;

  container.innerHTML = `
    <div class="file-card">
      <span class="file-icon">🎯</span>
      <div class="file-meta">
        <div class="file-name">מצגת שיעור ${num}</div>
        <div class="file-desc">Google Slides</div>
      </div>
      ${f.presentation.drive_link ? `<a href="${f.presentation.drive_link}" target="_blank" class="btn btn-ghost btn-sm">פתח מצגת</a>` : '<span style="font-size:12px;color:var(--text3)">ללא קישור</span>'}
      <span class="badge ${f.presentation.approved ? 'badge-ok' : 'badge-warn'}">
        ${f.presentation.approved ? '✓ מאושרת' : '⚠ לא מאושרת'}
      </span>
    </div>

    ${(f.work_sheets || []).length ? `
      <div class="section">
        <div class="section-header">
          <span class="section-title">📄 דפי עבודה</span>
        </div>
        <div class="section-body">
          ${f.work_sheets.map(ws => `
            <div class="print-item">
              <span style="font-size:16px">📄</span>
              <div class="file-meta" style="flex:1">
                <div class="file-name">${ws.name}</div>
                <div class="file-desc">כמות: ${calcQuantity(ws.quantity_formula)} עותקים</div>
              </div>
              ${ws.drive_link ? `<a href="${ws.drive_link}" target="_blank" class="btn btn-ghost btn-sm">⬇️ הורדה</a>` : ''}
            </div>`).join('')}
        </div>
      </div>` : ''}

    <div class="file-card">
      <span class="file-icon">🎬</span>
      <div class="file-meta" style="flex:1">
        <div class="file-name">הקלטת השיעור</div>
        <div class="file-desc">לאחר עריכה ואישור אייל</div>
      </div>
      <div class="link-field-wrap" style="flex:1">
        <input type="text" class="link-input" placeholder="קישור להקלטה..."
               value="${localStorage.getItem(recLinkKey) || f.recording_link || ''}"
               onchange="saveLinkField('${recLinkKey}', this.value)">
        ${localStorage.getItem(recLinkKey) ? `<a href="${localStorage.getItem(recLinkKey)}" target="_blank" class="btn btn-ghost btn-sm">פתח</a>` : ''}
      </div>
    </div>
  `;
}

// ─── GENERAL PAGES ────────────────────────────────────────────────────────────
function renderGeneralPage(container) {
  const g = state.general;
  if (!g) { container.innerHTML = '<div class="empty-state"><div class="empty-state-text">טוען...</div></div>'; return; }

  const studentsKey = 'students_count';
  const location = localStorage.getItem('workshop_location') || g.workshop.location || '';
  const notes = localStorage.getItem('workshop_notes') || g.workshop.notes || '';

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">🏠 מידע כללי</div>
      <div class="page-subtitle">${g.workshop.name} — ${g.workshop.subtitle}</div>
    </div>
    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-label">שם הסדנה</div>
        <div class="info-card-value">${g.workshop.name}</div>
        <div class="info-card-sub">${g.workshop.subtitle}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">מספר שיעורים</div>
        <div class="info-card-value">${g.workshop.total_lessons}</div>
        <div class="info-card-sub">שיעורים פרונטליים</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">מספר תלמידים</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
          <input type="number" class="students-input" value="${state.studentsCount}"
                 min="1" max="200" onchange="updateStudentsCount(this.value)"
                 style="width:80px">
          <span style="font-size:13px;color:var(--text3)">משפיע על כל הכמויות</span>
        </div>
      </div>
      <div class="info-card">
        <div class="info-card-label">מיקום</div>
        <input type="text" class="link-input" placeholder="כתובת המקום..."
               value="${location}"
               onchange="localStorage.setItem('workshop_location', this.value)"
               style="margin-top:6px">
      </div>
    </div>

    <div class="section">
      <div class="section-header"><span class="section-title">📅 לוח זמנים</span></div>
      <div class="section-body" style="padding:0">
        <table class="schedule-table">
          <thead>
            <tr>
              <th>#</th>
              <th>נושא</th>
              <th>תאריך</th>
              <th>שעה</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${g.schedule.map(s => {
              const lesson = state.lessons[s.lesson];
              const title = lesson ? lesson.title : s.title;
              const dateKey = `schedule_date_${s.lesson}`;
              const savedDate = localStorage.getItem(dateKey) || s.date;
              return `<tr>
                <td><span style="font-weight:700;color:var(--purple)">שיעור ${s.lesson}</span></td>
                <td>${title || '—'}</td>
                <td><input type="text" style="background:transparent;border:none;color:var(--text1);font-family:Heebo;font-size:13px;width:100px;direction:ltr"
                           value="${savedDate}" placeholder="DD/MM/YY"
                           onchange="localStorage.setItem('${dateKey}', this.value)"></td>
                <td style="direction:ltr">${s.time}</td>
                <td><button class="btn btn-ghost btn-sm" onclick="navigateTo('lesson_${s.lesson}')">פתח</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><span class="section-title">📝 הערות כלליות</span></div>
      <div class="section-body">
        <textarea style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text1);font-family:Heebo;font-size:13px;direction:rtl;min-height:80px;resize:vertical;outline:none"
                  placeholder="הערות כלליות על הסדנה..."
                  onchange="localStorage.setItem('workshop_notes', this.value)">${notes}</textarea>
      </div>
    </div>
  `;
}

function renderSetupPage(container) {
  const g = state.general;
  if (!g) return;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">⚙️ הקמת הסדנה</div>
      <div class="page-subtitle">צ'קליסט חד-פעמי — לבצע פעם אחת לפני תחילת הסדנה</div>
    </div>
    ${renderSection('צ\'קליסט הקמה', renderChecklistItems(g.setup_checklist, 0, 'setup'))}
  `;
  loadCheckboxStates(0);
}

function renderMentorsPage(container) {
  const g = state.general;
  if (!g) return;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">📋 דגשים למנטורים</div>
      <div class="page-subtitle">מדריך לכל מנטור שמעביר שיעור — לקרוא לפני כל שיעור</div>
    </div>
    <div class="section">
      <div class="section-header"><span class="section-title">מדריך תפעול</span></div>
      <div class="section-body">
        ${g.mentor_guide.map((step, idx) => `
          <div class="mentor-step">
            <div class="mentor-step-num">${idx+1}</div>
            <div class="mentor-step-content">
              <div class="mentor-step-title">${step.title}</div>
              <div class="mentor-step-desc">${step.description}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function renderBetweenPage(container) {
  const g = state.general;
  if (!g) return;
  const b = g.between_lessons;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">🔄 מה קורה בין המפגשים?</div>
      <div class="page-subtitle">תהליכים שמתרחשים בין שיעור לשיעור</div>
    </div>
    ${renderSection('תזכורות לתלמידים', b.reminders.map(r => `
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span>📢</span><span style="font-size:13.5px;color:var(--text1)">${r}</span>
      </div>`).join(''))}
    ${renderSection('מעקב ביצוע משימות', b.homework_followup.map(r => `
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span>✅</span><span style="font-size:13.5px;color:var(--text1)">${r}</span>
      </div>`).join(''))}
    ${renderSection('הכנות לשיעור הבא', b.next_lesson_prep.map(r => `
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span>🎯</span><span style="font-size:13.5px;color:var(--text1)">${r}</span>
      </div>`).join(''))}
  `;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function renderSection(title, bodyHtml) {
  return `
    <div class="section">
      <div class="section-header">
        <span class="section-title">${title}</span>
      </div>
      <div class="section-body">${bodyHtml}</div>
    </div>`;
}

function calcQuantity(formula) {
  if (!formula) return '—';
  if (formula === 'students_count') return `${state.studentsCount}`;
  if (typeof formula === 'string' && formula.includes('students_count')) {
    try {
      const result = Math.ceil(eval(formula.replace('students_count', state.studentsCount)));
      return `${result}`;
    } catch { return formula; }
  }
  return formula;
}

function toggleCheck(key, checked) {
  localStorage.setItem(key, checked ? 'true' : 'false');
  const li = document.getElementById(`ci-${key}`);
  if (li) li.classList.toggle('done', checked);
  renderSidebar();
}

function toggleNote(id) {
  document.getElementById(id).classList.toggle('open');
}

function togglePrintApproval(key, btn) {
  const current = localStorage.getItem(key) === 'true';
  const newVal = !current;
  localStorage.setItem(key, newVal ? 'true' : 'false');
  btn.textContent = newVal ? '✓ נשלח לאייל' : 'שלח אישור לאייל';
  btn.classList.toggle('pending', !newVal);
}

function saveLinkField(key, value) {
  localStorage.setItem(key, value);
}

function copyMessage(id, text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(`copy-${id}`);
    if (btn) {
      btn.textContent = '✓ הועתק!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 העתק';
        btn.classList.remove('copied');
      }, 2000);
    }
  });
}

function updateStudentsCount(val) {
  state.studentsCount = parseInt(val) || 25;
  localStorage.setItem('students_count', state.studentsCount);
  // Re-render quantities if on a lesson page
  if (state.currentPage.startsWith('lesson_')) {
    const num = parseInt(state.currentPage.replace('lesson_', ''));
    renderLessonTab(num, state.currentTab);
  }
}

function loadCheckboxStates(num) {
  // States are loaded from localStorage in render; no extra step needed
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) { results.style.display = 'none'; return; }
    const hits = searchAll(q);
    if (!hits.length) {
      results.innerHTML = '<div class="search-result-item" style="color:var(--text3)">לא נמצאו תוצאות</div>';
    } else {
      results.innerHTML = hits.slice(0, 15).map(h => `
        <div class="search-result-item" onclick="navigateTo('${h.page}');document.getElementById('search-input').value='';document.getElementById('search-results').style.display='none'">
          <div class="search-result-lesson">${h.context}</div>
          <div class="search-result-text">${h.text}</div>
        </div>`).join('');
    }
    results.style.display = 'block';
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) results.style.display = 'none';
  });
}

function searchAll(q) {
  const ql = q.toLowerCase();
  const hits = [];

  for (let i = 1; i <= 10; i++) {
    const lesson = state.lessons[i];
    if (!lesson) continue;

    const searchIn = (text, context) => {
      if (text && text.toLowerCase().includes(ql)) {
        hits.push({ page: `lesson_${i}`, context: `שיעור ${i} — ${context}`, text });
      }
    };

    lesson.before?.preparations?.forEach(p => searchIn(p.text, 'לפני השיעור'));
    lesson.before?.purchases?.forEach(p => searchIn(p.text, 'לפני השיעור - רכישות'));
    lesson.before?.print_materials?.forEach(p => searchIn(p.name, 'לפני השיעור - הדפסות'));
    lesson.during?.stages?.forEach(s => searchIn(s.title + ' ' + s.description, 'במהלך השיעור'));
    lesson.after?.whatsapp_messages?.forEach(m => searchIn(m.name, 'אחרי השיעור'));
  }

  if (state.general) {
    state.general.mentor_guide?.forEach(m => {
      if ((m.title + m.description).toLowerCase().includes(ql)) {
        hits.push({ page: 'mentors', context: 'דגשים למנטורים', text: m.title });
      }
    });
  }

  return hits;
}

// ─── PRINT ────────────────────────────────────────────────────────────────────
function printLesson() {
  window.print();
}

// Mobile menu
function toggleMobileMenu() {
  document.querySelector('.sidebar').classList.toggle('mobile-open');
}

// Start
init();
