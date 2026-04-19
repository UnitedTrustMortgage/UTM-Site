/* =============================================================
   PARTNERS HUB — App logic
   State, form wiring, flyer templates, live preview, export.
   Modular so new resources can slot in.
   ============================================================= */

(() => {
  'use strict';

  // ---------- CONSTANTS ----------
  const ARIN = {
    name: 'Arin Baghermian',
    role: 'Mortgage Broker',
    nmls: 'NMLS #1220456',
    email: 'Arin@myunitedtrust.com',
    phone: '818.447.7705',
    web: 'myunitedtrust.com',
    companyNmls: 'United Trust Mortgage · NMLS #2591548',
    photo: 'assets/arin-headshot.jpg',
  };

  const THEMES = {
    navy:       { bg: '#0B1E3F', fg: '#FAF7F2', accent: '#CDA26A', soft: '#13294D' },
    cream:      { bg: '#FAF7F2', fg: '#0B1E3F', accent: '#CDA26A', soft: '#F2EDE4' },
    forest:     { bg: '#2F4F3F', fg: '#F3EEE3', accent: '#D4A763', soft: '#3B5E4C' },
    terracotta: { bg: '#B5583F', fg: '#FAF0E6', accent: '#F2D3B8', soft: '#C46A52' },
    charcoal:   { bg: '#1C1C1E', fg: '#F5F1EA', accent: '#CDA26A', soft: '#2A2A2C' },
    warmgold:   { bg: '#0B1E3F', fg: '#FAF7F2', accent: '#CDA26A', soft: '#132D5A' },
  };

  const LOAN_PROGRAMS = [
    // Non-QM (featured)
    { id:'dscr',     name:'DSCR',               sub:'Rental-income qualifying. No W-2s.',         cat:'nonqm', ico:'⌂' },
    { id:'bankstmt', name:'Bank Statement',     sub:'12–24mo statements for self-employed.',      cat:'nonqm', ico:'≋' },
    { id:'pnl',      name:'P&L Only',           sub:'CPA-prepared profit & loss qualification.',  cat:'nonqm', ico:'◈' },
    { id:'asset',    name:'Asset Depletion',    sub:'Qualify using liquid assets, not income.',   cat:'nonqm', ico:'◉' },
    { id:'foreign',  name:'Foreign National',   sub:'No US credit? No problem.',                  cat:'nonqm', ico:'✦' },
    { id:'itin',     name:'ITIN',               sub:'No SSN required. ITIN-based financing.',     cat:'nonqm', ico:'✚' },
    { id:'altdoc',   name:'Alt-Doc',            sub:'Flexible documentation programs.',           cat:'nonqm', ico:'▤' },
    // Traditional (secondary)
    { id:'conv',     name:'Conventional',       sub:'Fannie/Freddie conforming.',                 cat:'trad',  ico:'◎' },
    { id:'fha',      name:'FHA',                sub:'Low down payment, flexible credit.',         cat:'trad',  ico:'◇' },
    { id:'va',       name:'VA',                 sub:'Zero down for eligible veterans.',           cat:'trad',  ico:'★' },
    { id:'jumbo',    name:'Jumbo',              sub:'Loans above conforming limits.',             cat:'trad',  ico:'◆' },
  ];

  // ---------- STATE ----------
  const STORAGE_KEY = 'utm.partners.v1';
  const state = {
    flyerType: 'open-house',
    brand: 'solo',
    theme: 'navy',
    tagline: '',
    partner: {
      first:'', last:'', email:'', phone:'',
      license:'', company:'', website:'', companyLic:'',
      headshot: null, // dataURL
    },
    // Per-flyer data
    openHouse: {
      photo: null,
      address: '',
      city: '',
      date: '',
      time: '',
      beds: '',
      baths: '',
      sqft: '',
      price: '',
      features: 'Gated community\nRemodeled kitchen\nPool & spa',
    },
    justFunded: {
      photo: null,
      address: '',
      city: '',
      amount: '',
      program: '',
      testimonial: '',
      daysToClose: '',
    },
    loanPrograms: {
      selected: ['dscr','bankstmt','pnl','foreign','itin'],
      headline: 'Programs built for buyers traditional lenders overlook',
      cta: 'Call today for a 15-minute scenario review',
    },
  };

  // ---------- PERSISTENCE ----------
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e) {}
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      Object.assign(state, s);
    } catch(e) {}
  }

  // ---------- UTIL ----------
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function notify(msg) {
    const n = $('#notif'); if (!n) return;
    $('#notifMsg').textContent = msg;
    n.classList.add('visible');
    clearTimeout(notify._t);
    notify._t = setTimeout(()=>n.classList.remove('visible'), 1800);
  }

  // ---------- FIELD PANEL RENDERING (per flyer type) ----------
  function renderFieldsPanel() {
    const body = $('#fieldsPanelBody');
    const title = $('#fieldsPanelTitle');
    const pill = $('#fieldsPanelPill');

    if (state.flyerType === 'open-house') {
      title.textContent = 'Open house details';
      pill.textContent = 'Required';
      body.innerHTML = `
        <div class="fg full" style="margin-bottom:14px;">
          <label>Property photo</label>
          <div class="upload-drop" id="ohPhotoDrop">
            <input type="file" id="ohPhotoInput" accept="image/*"/>
            <div class="upload-drop-empty">
              <div class="upload-icon">⤴</div>
              <div class="upload-title">Upload property photo</div>
              <div class="upload-sub">Landscape works best · JPG or PNG</div>
            </div>
            <div class="upload-preview" style="display:none;">
              <img class="upload-preview-img" alt=""/>
              <div class="upload-preview-info">
                <div class="upload-preview-name"></div>
                <div class="upload-preview-meta">Ready to use</div>
              </div>
              <button type="button" class="upload-remove" data-remove="ohPhoto">✕</button>
            </div>
          </div>
        </div>
        <div class="form-grid">
          <div class="fg full"><label>Street address</label><input type="text" id="ohAddress" placeholder="1234 Palm Avenue" value="${esc(state.openHouse.address)}"/></div>
          <div class="fg"><label>City, state</label><input type="text" id="ohCity" placeholder="Glendale, CA 91203" value="${esc(state.openHouse.city)}"/></div>
          <div class="fg"><label>List price</label><input type="text" id="ohPrice" placeholder="$1,495,000" value="${esc(state.openHouse.price)}"/></div>
          <div class="fg"><label>Open house date</label><input type="text" id="ohDate" placeholder="Saturday, Mar 15" value="${esc(state.openHouse.date)}"/></div>
          <div class="fg"><label>Time</label><input type="text" id="ohTime" placeholder="1:00 – 4:00 PM" value="${esc(state.openHouse.time)}"/></div>
          <div class="form-grid three" style="grid-column:1/-1;">
            <div class="fg"><label>Beds</label><input type="number" id="ohBeds" placeholder="4" value="${esc(state.openHouse.beds)}"/></div>
            <div class="fg"><label>Baths</label><input type="number" id="ohBaths" step="0.5" placeholder="3" value="${esc(state.openHouse.baths)}"/></div>
            <div class="fg"><label>Sq ft</label><input type="number" id="ohSqft" placeholder="2,450" value="${esc(state.openHouse.sqft)}"/></div>
          </div>
          <div class="fg full"><label>Features <span style="text-transform:none;letter-spacing:normal;color:var(--ink-mute);">(one per line)</span></label>
            <textarea id="ohFeatures" placeholder="Pool &amp; spa\nRemodeled kitchen\nADU\nGated community">${esc(state.openHouse.features)}</textarea>
          </div>
        </div>
      `;
      wireUpload('ohPhotoDrop','ohPhotoInput','ohPhoto', (dataURL)=>{ state.openHouse.photo = dataURL; saveAndRender(); });
      if (state.openHouse.photo) showPreview('ohPhotoDrop', state.openHouse.photo, 'Property photo');
      ['ohAddress','ohCity','ohPrice','ohDate','ohTime','ohBeds','ohBaths','ohSqft','ohFeatures'].forEach(id => {
        const el = $('#'+id); if (!el) return;
        el.addEventListener('input', () => {
          const key = id.replace('oh','');
          const k = key.charAt(0).toLowerCase() + key.slice(1);
          state.openHouse[k] = el.value;
          saveAndRender();
        });
      });
    }

    else if (state.flyerType === 'just-funded') {
      title.textContent = 'Just funded details';
      pill.textContent = 'Required';
      body.innerHTML = `
        <div class="fg full" style="margin-bottom:14px;">
          <label>Property photo</label>
          <div class="upload-drop" id="jfPhotoDrop">
            <input type="file" id="jfPhotoInput" accept="image/*"/>
            <div class="upload-drop-empty">
              <div class="upload-icon">⤴</div>
              <div class="upload-title">Upload property photo</div>
              <div class="upload-sub">Landscape works best · JPG or PNG</div>
            </div>
            <div class="upload-preview" style="display:none;">
              <img class="upload-preview-img" alt=""/>
              <div class="upload-preview-info">
                <div class="upload-preview-name"></div>
                <div class="upload-preview-meta">Ready to use</div>
              </div>
              <button type="button" class="upload-remove" data-remove="jfPhoto">✕</button>
            </div>
          </div>
        </div>
        <div class="form-grid">
          <div class="fg full"><label>Property address</label><input type="text" id="jfAddress" placeholder="1234 Palm Avenue" value="${esc(state.justFunded.address)}"/></div>
          <div class="fg"><label>City</label><input type="text" id="jfCity" placeholder="Glendale, CA" value="${esc(state.justFunded.city)}"/></div>
          <div class="fg"><label>Loan amount</label><input type="text" id="jfAmount" placeholder="$1,250,000" value="${esc(state.justFunded.amount)}"/></div>
          <div class="fg"><label>Program used</label><input type="text" id="jfProgram" placeholder="DSCR · Non-QM" value="${esc(state.justFunded.program)}"/></div>
          <div class="fg"><label>Days to close</label><input type="text" id="jfDays" placeholder="14" value="${esc(state.justFunded.daysToClose)}"/></div>
          <div class="fg full"><label>Client testimonial <span style="text-transform:none;letter-spacing:normal;color:var(--ink-mute);">(optional)</span></label>
            <textarea id="jfTestimonial" placeholder="Thanks to Jane and Arin, we closed in two weeks...">${esc(state.justFunded.testimonial)}</textarea>
          </div>
        </div>
      `;
      wireUpload('jfPhotoDrop','jfPhotoInput','jfPhoto', (dataURL)=>{ state.justFunded.photo = dataURL; saveAndRender(); });
      if (state.justFunded.photo) showPreview('jfPhotoDrop', state.justFunded.photo, 'Property photo');
      ['jfAddress','jfCity','jfAmount','jfProgram','jfDays','jfTestimonial'].forEach(id=>{
        const el = $('#'+id); if(!el) return;
        el.addEventListener('input', () => {
          const map = { jfAddress:'address', jfCity:'city', jfAmount:'amount', jfProgram:'program', jfDays:'daysToClose', jfTestimonial:'testimonial' };
          state.justFunded[map[id]] = el.value;
          saveAndRender();
        });
      });
    }

    else if (state.flyerType === 'loan-programs') {
      title.textContent = 'Loan programs details';
      pill.textContent = 'Pick 3–6';
      const nonqm = LOAN_PROGRAMS.filter(p => p.cat === 'nonqm');
      const trad  = LOAN_PROGRAMS.filter(p => p.cat === 'trad');
      const chip = (p) => `
        <button class="loan-chip-p ${state.loanPrograms.selected.includes(p.id)?'selected':''}" data-loan="${p.id}">
          <div class="lc-head">
            <span class="lc-ico">${p.ico}</span>
            <span class="lc-name">${p.name}</span>
          </div>
          <div class="lc-sub">${p.sub}</div>
        </button>`;
      body.innerHTML = `
        <div class="fg full" style="margin-bottom:16px;">
          <label for="lpHeadline">Headline</label>
          <input type="text" id="lpHeadline" value="${esc(state.loanPrograms.headline)}"/>
        </div>

        <div class="category-label">Non-QM <span class="pill">Featured</span></div>
        <div class="loan-chips">${nonqm.map(chip).join('')}</div>

        <div class="category-label" style="margin-top:20px;">Traditional</div>
        <div class="loan-chips">${trad.map(chip).join('')}</div>

        <div class="fg full" style="margin-top:18px;">
          <label for="lpCta">Call-to-action</label>
          <input type="text" id="lpCta" value="${esc(state.loanPrograms.cta)}"/>
        </div>
      `;
      $$('.loan-chip-p', body).forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.loan;
          const set = new Set(state.loanPrograms.selected);
          set.has(id) ? set.delete(id) : set.add(id);
          state.loanPrograms.selected = [...set];
          btn.classList.toggle('selected');
          saveAndRender();
        });
      });
      $('#lpHeadline').addEventListener('input', e => { state.loanPrograms.headline = e.target.value; saveAndRender(); });
      $('#lpCta').addEventListener('input', e => { state.loanPrograms.cta = e.target.value; saveAndRender(); });
    }
  }

  // ---------- UPLOAD HANDLING ----------
  function wireUpload(dropId, inputId, name, onLoad) {
    const drop = $('#'+dropId);
    const input = $('#'+inputId);
    if (!drop || !input) return;
    input.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        showPreview(dropId, reader.result, f.name);
        onLoad(reader.result);
      };
      reader.readAsDataURL(f);
    });
    // remove btn
    const rem = drop.querySelector('[data-remove]');
    if (rem) rem.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      input.value = '';
      drop.classList.remove('has-file');
      drop.querySelector('.upload-drop-empty').style.display = '';
      drop.querySelector('.upload-preview').style.display = 'none';
      onLoad(null);
    });
  }

  function showPreview(dropId, dataURL, name) {
    const drop = $('#'+dropId); if (!drop) return;
    drop.classList.add('has-file');
    drop.querySelector('.upload-drop-empty').style.display = 'none';
    const prev = drop.querySelector('.upload-preview');
    prev.style.display = '';
    prev.querySelector('.upload-preview-img').src = dataURL;
    prev.querySelector('.upload-preview-name').textContent = name || 'Uploaded';
  }

  // ---------- FLYER TEMPLATES ----------
  function renderFlyer() {
    const canvas = $('#flyerCanvas');
    if (!canvas) return;
    const t = THEMES[state.theme];

    let html = '';
    if (state.flyerType === 'open-house') html = tmplOpenHouse(t);
    else if (state.flyerType === 'just-funded') html = tmplJustFunded(t);
    else if (state.flyerType === 'loan-programs') html = tmplLoanPrograms(t);

    canvas.innerHTML = html;
  }

  // Shared partner & co-brand footer block
  function partnerFooterHtml(t) {
    const p = state.partner;
    const pFull = [p.first, p.last].filter(Boolean).join(' ') || 'Your Name';
    const pCompany = p.company || 'Your Company';
    const coBrand = state.brand === 'co';
    const border = `1px solid ${hexA(t.fg, 0.15)}`;

    const agentBlock = `
      <div style="display:flex; gap:10px; align-items:center; flex:1; min-width:0;">
        ${p.headshot
          ? `<img src="${p.headshot}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:1.5px solid ${t.accent}; flex-shrink:0;"/>`
          : `<div style="width:46px;height:46px;border-radius:50%;background:${hexA(t.fg,0.12)};border:1.5px solid ${t.accent};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:Instrument Serif, serif;font-size:18px;color:${t.accent};">${initials(pFull)}</div>`}
        <div style="min-width:0; flex:1;">
          <div style="font-family:Instrument Serif, serif; font-size:15px; line-height:1.1; letter-spacing:-0.01em;">${esc(pFull)}</div>
          <div style="font-size:8.5px; opacity:0.72; margin-top:2px; line-height:1.3;">${esc(pCompany)}${p.license?` · ${esc(p.license)}`:''}</div>
          <div style="font-size:8px; opacity:0.58; margin-top:1px; line-height:1.3;">${esc(p.phone||'')} ${p.email?` · ${esc(p.email)}`:''}</div>
        </div>
      </div>`;

    const arinBlock = `
      <div style="display:flex; gap:10px; align-items:center; flex:1; min-width:0;">
        <img src="${ARIN.photo}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:1.5px solid ${t.accent};flex-shrink:0;"/>
        <div style="min-width:0; flex:1;">
          <div style="font-family:Instrument Serif, serif; font-size:15px; line-height:1.1; letter-spacing:-0.01em;">${ARIN.name}</div>
          <div style="font-size:8.5px; opacity:0.72; margin-top:2px; line-height:1.3;">${ARIN.role} · ${ARIN.nmls}</div>
          <div style="font-size:8px; opacity:0.58; margin-top:1px; line-height:1.3;">${ARIN.phone} · ${ARIN.email}</div>
        </div>
      </div>`;

    if (coBrand) {
      return `
        <div style="border-top:${border}; padding:12px 16px; display:flex; align-items:stretch; gap:10px; background:${hexA(t.fg,0.04)};">
          ${agentBlock}
          <div style="width:1px; background:${hexA(t.fg,0.15)}; flex-shrink:0;"></div>
          ${arinBlock}
        </div>
        <div style="padding:6px 16px; font-size:7.5px; font-family:JetBrains Mono, monospace; letter-spacing:0.1em; text-transform:uppercase; opacity:0.5; text-align:center; border-top:${border};">
          ${esc(p.companyLic||'')}${p.companyLic?' · ':''}${ARIN.companyNmls}
        </div>`;
    }

    return `
      <div style="border-top:${border}; padding:14px 16px; display:flex; gap:12px; align-items:center;">
        ${agentBlock}
      </div>
      ${p.website || p.companyLic ? `
        <div style="padding:6px 16px; font-size:7.5px; font-family:JetBrains Mono, monospace; letter-spacing:0.1em; text-transform:uppercase; opacity:0.5; text-align:center; border-top:${border};">
          ${esc(p.website||'')}${p.website && p.companyLic ? ' · ':''}${esc(p.companyLic||'')}
        </div>` : ''}`;
  }

  // ---- Open House template ----
  function tmplOpenHouse(t) {
    const d = state.openHouse;
    const features = (d.features||'').split('\n').map(s=>s.trim()).filter(Boolean);
    const heroText = state.tagline || 'Open House';

    return `
      <div style="width:100%; aspect-ratio: 3/4; background:${t.bg}; color:${t.fg}; display:flex; flex-direction:column; position:relative; font-family:Inter, sans-serif;">

        <!-- Top bar -->
        <div style="padding:16px 18px 10px; display:flex; justify-content:space-between; align-items:center; font-family:JetBrains Mono, monospace; font-size:8.5px; letter-spacing:0.15em; text-transform:uppercase;">
          <span style="opacity:0.7;">${esc(heroText)}</span>
          <span style="display:inline-flex; align-items:center; gap:5px;">
            <span style="width:5px; height:5px; border-radius:50%; background:${t.accent};"></span>
            ${d.date ? esc(d.date) : 'This weekend'}
          </span>
        </div>

        <!-- Hero photo -->
        <div style="margin:0 18px; border-radius:8px; overflow:hidden; aspect-ratio:4/3; background:${hexA(t.fg, 0.08)}; position:relative;">
          ${d.photo
            ? `<img src="${d.photo}" style="width:100%; height:100%; object-fit:cover; display:block;"/>`
            : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-family:Instrument Serif, serif; font-style:italic; font-size:16px; opacity:0.4;">Property photo</div>`}
          ${d.price ? `<div style="position:absolute; bottom:10px; left:10px; background:${t.accent}; color:${t.bg}; padding:5px 12px; border-radius:99px; font-family:Instrument Serif, serif; font-size:15px; letter-spacing:-0.01em;">${esc(d.price)}</div>`:''}
        </div>

        <!-- Title block -->
        <div style="padding:14px 18px 12px;">
          <div style="font-family:Instrument Serif, serif; font-size:28px; line-height:1.0; letter-spacing:-0.025em; text-wrap:balance;">
            ${esc(d.address || '1234 Palm Avenue')}
          </div>
          <div style="font-size:10.5px; opacity:0.75; margin-top:4px; letter-spacing:0.02em;">${esc(d.city || 'Glendale, CA')}</div>
        </div>

        <!-- Stats row -->
        <div style="margin:0 18px; display:grid; grid-template-columns:1fr 1fr 1fr; border:1px solid ${hexA(t.fg,0.15)}; border-radius:6px; overflow:hidden;">
          ${[{n:d.beds,l:'Beds'},{n:d.baths,l:'Baths'},{n:d.sqft,l:'Sq Ft'}].map((s,i)=>`
            <div style="padding:8px 6px; text-align:center; ${i<2?`border-right:1px solid ${hexA(t.fg,0.12)};`:''}">
              <div style="font-family:Instrument Serif, serif; font-size:20px; line-height:1; letter-spacing:-0.02em;">${esc(s.n||'—')}</div>
              <div style="font-family:JetBrains Mono, monospace; font-size:7px; letter-spacing:0.14em; text-transform:uppercase; opacity:0.6; margin-top:3px;">${s.l}</div>
            </div>`).join('')}
        </div>

        <!-- Features -->
        ${features.length ? `
        <div style="padding:12px 18px; flex:1; min-height:0;">
          <div style="font-family:JetBrains Mono, monospace; font-size:7.5px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.5; margin-bottom:6px;">Features</div>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            ${features.slice(0,6).map(f=>`<span style="font-size:9px; padding:3px 8px; border:1px solid ${hexA(t.fg,0.2)}; border-radius:99px; white-space:nowrap;">${esc(f)}</span>`).join('')}
          </div>
        </div>` : `<div style="flex:1;"></div>`}

        <!-- Open house date strip -->
        ${(d.date||d.time) ? `
        <div style="margin:0 18px 10px; padding:9px 12px; background:${t.accent}; color:${t.bg}; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-family:Instrument Serif, serif; font-size:14px; letter-spacing:-0.01em;">Open House</div>
          <div style="font-family:JetBrains Mono, monospace; font-size:9.5px; letter-spacing:0.06em;">${esc(d.date||'')}${d.date&&d.time?' · ':''}${esc(d.time||'')}</div>
        </div>` : ''}

        <!-- Partner footer -->
        ${partnerFooterHtml(t)}
      </div>`;
  }

  // ---- Just Funded template ----
  function tmplJustFunded(t) {
    const d = state.justFunded;
    const heroText = state.tagline || 'Just Funded';
    return `
      <div style="width:100%; aspect-ratio:3/4; background:${t.bg}; color:${t.fg}; display:flex; flex-direction:column; position:relative; font-family:Inter, sans-serif;">

        <!-- Big celebratory tag -->
        <div style="padding:18px 18px 6px; text-align:center;">
          <div style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border:1px solid ${t.accent}; border-radius:99px; font-family:JetBrains Mono, monospace; font-size:8.5px; letter-spacing:0.18em; text-transform:uppercase; color:${t.accent};">
            <span style="width:5px; height:5px; border-radius:50%; background:${t.accent};"></span>
            ${esc(heroText)}
          </div>
        </div>

        <!-- Headline -->
        <div style="padding:6px 20px 12px; text-align:center;">
          <div style="font-family:Instrument Serif, serif; font-size:36px; line-height:0.95; letter-spacing:-0.03em; text-wrap:balance;">
            Another <em style="color:${t.accent}; font-style:italic;">home</em><br/>closed.
          </div>
        </div>

        <!-- Property photo -->
        <div style="margin:0 18px; border-radius:8px; overflow:hidden; aspect-ratio:5/4; background:${hexA(t.fg,0.08)}; position:relative;">
          ${d.photo
            ? `<img src="${d.photo}" style="width:100%; height:100%; object-fit:cover; display:block;"/>`
            : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-family:Instrument Serif, serif; font-style:italic; font-size:16px; opacity:0.4;">Property photo</div>`}

          <!-- Funded badge bottom-right -->
          ${d.amount ? `
          <div style="position:absolute; bottom:10px; right:10px; background:${t.bg}; color:${t.fg}; padding:8px 12px; border-radius:6px; border:1px solid ${t.accent};">
            <div style="font-family:JetBrains Mono, monospace; font-size:7px; letter-spacing:0.18em; text-transform:uppercase; opacity:0.6;">Loan Amount</div>
            <div style="font-family:Instrument Serif, serif; font-size:16px; line-height:1; letter-spacing:-0.02em; margin-top:2px;">${esc(d.amount)}</div>
          </div>` : ''}
        </div>

        <!-- Address + meta -->
        <div style="padding:14px 18px 6px;">
          <div style="font-family:Instrument Serif, serif; font-size:18px; line-height:1.1; letter-spacing:-0.015em;">${esc(d.address||'1234 Palm Avenue')}</div>
          <div style="font-size:10px; opacity:0.7; margin-top:2px;">${esc(d.city||'Glendale, CA')}</div>
        </div>

        <!-- Program + days -->
        <div style="padding:6px 18px 12px; display:flex; gap:10px;">
          ${d.program ? `<div style="padding:6px 10px; background:${hexA(t.fg,0.08)}; border-radius:5px; flex:1;">
            <div style="font-family:JetBrains Mono, monospace; font-size:7px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.6;">Program</div>
            <div style="font-size:11px; margin-top:2px;">${esc(d.program)}</div>
          </div>`:''}
          ${d.daysToClose ? `<div style="padding:6px 10px; background:${hexA(t.fg,0.08)}; border-radius:5px;">
            <div style="font-family:JetBrains Mono, monospace; font-size:7px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.6;">Days to close</div>
            <div style="font-size:11px; margin-top:2px;">${esc(d.daysToClose)}</div>
          </div>`:''}
        </div>

        <!-- Testimonial -->
        ${d.testimonial ? `
        <div style="margin:0 18px 12px; padding:10px 12px; border-left:2px solid ${t.accent}; font-family:Instrument Serif, serif; font-style:italic; font-size:12px; line-height:1.4; opacity:0.88;">
          "${esc(d.testimonial)}"
        </div>` : '<div style="flex:1;"></div>'}

        ${partnerFooterHtml(t)}
      </div>`;
  }

  // ---- Loan Programs template ----
  function tmplLoanPrograms(t) {
    const sel = state.loanPrograms.selected.map(id => LOAN_PROGRAMS.find(p=>p.id===id)).filter(Boolean);
    const nonqm = sel.filter(p=>p.cat==='nonqm');
    const trad  = sel.filter(p=>p.cat==='trad');
    const headline = state.loanPrograms.headline || 'Programs built for every buyer';
    const cta = state.loanPrograms.cta || '';

    const chip = (p) => `
      <div style="padding:9px 10px; border:1px solid ${hexA(t.fg,0.18)}; border-radius:6px; display:flex; gap:8px; align-items:flex-start;">
        <div style="width:18px; height:18px; border-radius:4px; background:${t.accent}; color:${t.bg}; display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; margin-top:1px;">${p.ico}</div>
        <div style="min-width:0;">
          <div style="font-family:Instrument Serif, serif; font-size:12px; letter-spacing:-0.01em; line-height:1;">${esc(p.name)}</div>
          <div style="font-size:8px; opacity:0.65; margin-top:3px; line-height:1.35;">${esc(p.sub)}</div>
        </div>
      </div>`;

    return `
      <div style="width:100%; aspect-ratio:3/4; background:${t.bg}; color:${t.fg}; display:flex; flex-direction:column; font-family:Inter, sans-serif;">

        <!-- Top eyebrow -->
        <div style="padding:16px 18px 4px; display:flex; justify-content:space-between; align-items:center; font-family:JetBrains Mono, monospace; font-size:8px; letter-spacing:0.18em; text-transform:uppercase; opacity:0.65;">
          <span>Loan Programs</span>
          <span>United Trust · NMLS 2591548</span>
        </div>

        <!-- Headline -->
        <div style="padding:6px 18px 14px;">
          <div style="font-family:Instrument Serif, serif; font-size:24px; line-height:1.0; letter-spacing:-0.025em; text-wrap:balance;">
            ${esc(headline)}
          </div>
        </div>

        <!-- Non-QM featured block -->
        ${nonqm.length ? `
        <div style="margin:0 18px 12px; padding:12px; background:${hexA(t.fg,0.06)}; border-radius:8px; border:1px solid ${hexA(t.fg,0.12)};">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:9px;">
            <span style="font-family:JetBrains Mono, monospace; font-size:8px; letter-spacing:0.16em; text-transform:uppercase; color:${t.accent};">Non-QM</span>
            <span style="flex:1; height:1px; background:${hexA(t.fg,0.15)};"></span>
            <span style="font-family:JetBrains Mono, monospace; font-size:7.5px; letter-spacing:0.12em; opacity:0.55; text-transform:uppercase;">Featured</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            ${nonqm.map(chip).join('')}
          </div>
        </div>` : ''}

        <!-- Traditional -->
        ${trad.length ? `
        <div style="margin:0 18px 12px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
            <span style="font-family:JetBrains Mono, monospace; font-size:8px; letter-spacing:0.16em; text-transform:uppercase; opacity:0.7;">Traditional</span>
            <span style="flex:1; height:1px; background:${hexA(t.fg,0.12)};"></span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            ${trad.map(chip).join('')}
          </div>
        </div>` : ''}

        <div style="flex:1;"></div>

        <!-- CTA strip -->
        ${cta ? `
        <div style="margin:0 18px 12px; padding:10px 14px; background:${t.accent}; color:${t.bg}; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-family:Instrument Serif, serif; font-size:12px; letter-spacing:-0.01em; line-height:1.15;">${esc(cta)}</div>
          <div style="font-family:JetBrains Mono, monospace; font-size:10px; letter-spacing:0.02em; white-space:nowrap;">${esc(state.brand==='co' ? ARIN.phone : (state.partner.phone||ARIN.phone))}</div>
        </div>`: ''}

        ${partnerFooterHtml(t)}
      </div>`;
  }

  // ---------- HELPERS for templates ----------
  function hexA(hex, a) {
    const h = hex.replace('#','');
    const full = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
    const r = parseInt(full.slice(0,2),16), g = parseInt(full.slice(2,4),16), b = parseInt(full.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }
  function initials(n) {
    return (n||'').split(/\s+/).filter(Boolean).map(s=>s[0].toUpperCase()).slice(0,2).join('');
  }

  // ---------- WIRING ----------
  function saveAndRender() { save(); renderFlyer(); }

  function wirePartnerForm() {
    const fields = [
      ['pFirst','first'], ['pLast','last'], ['pEmail','email'], ['pPhone','phone'],
      ['pLicense','license'], ['pCompany','company'], ['pWebsite','website'], ['pCompanyLic','companyLic'],
    ];
    fields.forEach(([id,key]) => {
      const el = $('#'+id); if (!el) return;
      el.value = state.partner[key] || '';
      el.addEventListener('input', () => {
        state.partner[key] = el.value;
        $('#partnerSavedPill').style.display = '';
        saveAndRender();
      });
    });
    wireUpload('pHeadshotDrop','pHeadshotInput','pHeadshot', (dataURL)=>{
      state.partner.headshot = dataURL;
      saveAndRender();
    });
    if (state.partner.headshot) showPreview('pHeadshotDrop', state.partner.headshot, 'Your headshot');
  }

  function wireBrandToggle() {
    $$('.brand-opt').forEach(b => {
      b.addEventListener('click', () => {
        $$('.brand-opt').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked','false'); });
        b.classList.add('active'); b.setAttribute('aria-checked','true');
        state.brand = b.dataset.brand;
        $('#cobrandReveal').style.display = state.brand === 'co' ? '' : 'none';
        $('#brandStatusPill').textContent = state.brand === 'co' ? 'Co-branded' : 'Solo';
        saveAndRender();
      });
    });
    // restore
    $$('.brand-opt').forEach(b => {
      const is = b.dataset.brand === state.brand;
      b.classList.toggle('active', is);
      b.setAttribute('aria-checked', is ? 'true':'false');
    });
    $('#cobrandReveal').style.display = state.brand === 'co' ? '' : 'none';
    $('#brandStatusPill').textContent = state.brand === 'co' ? 'Co-branded' : 'Solo';
  }

  function wireFlyerTypeTabs() {
    $$('.flyer-type-btn').forEach(b => {
      b.addEventListener('click', () => {
        $$('.flyer-type-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        state.flyerType = b.dataset.flyer;
        renderFieldsPanel();
        saveAndRender();
      });
      if (b.dataset.flyer === state.flyerType) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  function wireThemeSwatches() {
    $$('.theme-swatch').forEach(s => {
      s.addEventListener('click', () => {
        $$('.theme-swatch').forEach(x=>x.classList.remove('selected'));
        s.classList.add('selected');
        state.theme = s.dataset.theme;
        saveAndRender();
      });
      if (s.dataset.theme === state.theme) s.classList.add('selected');
      else s.classList.remove('selected');
    });
    const tag = $('#tagline');
    if (tag) {
      tag.value = state.tagline || '';
      tag.addEventListener('input', () => { state.tagline = tag.value; saveAndRender(); });
    }
  }

  function wireResourceNav() {
    $$('.res-tab:not(.coming)').forEach(t => {
      t.addEventListener('click', () => {
        $$('.res-tab').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
        const id = t.dataset.resource;
        $$('.resource').forEach(r => r.classList.toggle('active', r.dataset.resource === id));
      });
    });
  }

  // ---------- EXPORT ----------
  async function exportPng() {
    const node = $('#flyerCanvas');
    if (!node) return;
    notify('Rendering PNG…');
    try {
      const canvas = await html2canvas(node, {
        scale: 3, backgroundColor: null, useCORS: true, logging: false,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `UTM-${state.flyerType}-flyer.png`;
      document.body.appendChild(a); a.click(); a.remove();
      notify('PNG downloaded');
    } catch(e) {
      console.error(e);
      notify('Export failed');
    }
  }
  async function exportPdf() {
    const node = $('#flyerCanvas');
    if (!node || !window.jspdf) return;
    notify('Rendering PDF…');
    try {
      const canvas = await html2canvas(node, {
        scale: 3, backgroundColor: null, useCORS: true, logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      // Flyer is 3:4 — Letter portrait (8.5×11) fits comfortably with margin
      const pdf = new jsPDF({ unit:'in', format:'letter', orientation:'portrait' });
      const pageW = 8.5, pageH = 11;
      const margin = 0.5;
      const availW = pageW - margin*2;
      const availH = pageH - margin*2;
      // fit 3:4 into available area, preserving aspect
      const aspect = 3/4;
      let w = availW, h = w / aspect;
      if (h > availH) { h = availH; w = h * aspect; }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(imgData, 'PNG', x, y, w, h);
      pdf.save(`UTM-${state.flyerType}-flyer.pdf`);
      notify('PDF downloaded');
    } catch(e) {
      console.error(e);
      notify('Export failed');
    }
  }

  function wireExport() {
    ['dlPngBtn','dlPngBtn2'].forEach(id => $('#'+id)?.addEventListener('click', exportPng));
    ['dlPdfBtn','dlPdfBtn2'].forEach(id => $('#'+id)?.addEventListener('click', exportPdf));
    $('#resetBtn')?.addEventListener('click', () => {
      if (!confirm('Reset all partner info and flyer fields on this browser?')) return;
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });
  }

  // ---------- INIT ----------
  function init() {
    load();
    wireBrandToggle();
    wirePartnerForm();
    wireFlyerTypeTabs();
    wireThemeSwatches();
    wireResourceNav();
    wireExport();
    renderFieldsPanel();
    renderFlyer();

    // Show "Saved" pill if partner has data
    const p = state.partner;
    if (p.first || p.last || p.email) $('#partnerSavedPill').style.display = '';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();

})();
