// ═══════════════════════════════════════════════
//   HASH LOCK — app.js
// ═══════════════════════════════════════════════

// ── DARK MODE ────────────────────────────────
const darkToggle = document.getElementById('darkToggle');
if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');

darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

// ── NAV TABS ─────────────────────────────────
const navTabs = document.querySelectorAll('.nav-tab');
const modules = document.querySelectorAll('.module');

navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        navTabs.forEach(t => t.classList.remove('active'));
        modules.forEach(m => m.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`module-${target}`).classList.add('active');
    });
});

// ── TOAST ─────────────────────────────────────
function showToast(msg, duration = 2200) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function copyText(text, label = 'Copied!') {
    navigator.clipboard.writeText(text).then(() => showToast(`✓ ${label}`));
}

// ══════════════════════════════════════════════
//   MODULE 1: PASSWORD STRENGTH ANALYZER
// ══════════════════════════════════════════════

const passwordInput = document.getElementById('passwordInput');
const toggleVis = document.getElementById('toggleVis');
const copyPwdBtn = document.getElementById('copyPwdBtn');
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');
const passwordResult = document.getElementById('passwordResult');
const pwdLength = document.getElementById('pwdLength');
const pwdLengthVal = document.getElementById('pwdLengthVal');
const generateBtn = document.getElementById('generateBtn');

// Track current password data for PDF export
let currentPasswordData = null;

// Show/hide password
let pwdVisible = false;
toggleVis.addEventListener('click', () => {
    pwdVisible = !pwdVisible;
    passwordInput.type = pwdVisible ? 'text' : 'password';
    toggleVis.style.opacity = pwdVisible ? '1' : '0.5';
});

copyPwdBtn.addEventListener('click', () => {
    const pwd = passwordInput.value.trim();
    if (!pwd) {
        showToast('⚠️ No password to copy');
        return;
    }
    copyText(pwd, 'Password copied!');
});

// Range label
pwdLength.addEventListener('input', () => {
    pwdLengthVal.textContent = `${pwdLength.value} chars`;
});

// Live password analysis
let debounceTimer;
passwordInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = passwordInput.value;
    if (!val) {
        resetPasswordUI();
        return;
    }
    debounceTimer = setTimeout(() => analyzePassword(val), 120);
});

async function analyzePassword(password) {
    try {
        const res = await fetch('/api/analyze-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        updatePasswordUI(data);
    } catch(e) {
        console.error(e);
    }
}

function updatePasswordUI(data) {
    currentPasswordData = { password: passwordInput.value, ...data };
    
    // Strength bar
    strengthFill.style.width = `${data.percent}%`;
    strengthFill.className = `strength-fill ${data.strength_class}`;
    strengthLabel.textContent = data.strength;
    strengthLabel.className = `strength-label ${data.strength_class}`;

    // Checklist
    updateCheck('length',    data.checks.length);
    updateCheck('uppercase', data.checks.uppercase);
    updateCheck('lowercase', data.checks.lowercase);
    updateCheck('number',    data.checks.number);
    updateCheck('special',   data.checks.special);
    updateCheck('no_common', data.checks.no_common);

    // Result panel
    const allGood = data.feedback.length === 1 && data.feedback[0].startsWith('Great');
    passwordResult.innerHTML = `
        <div class="password-result-card">
            <div class="result-score-row">
                <div>
                    <div class="result-score-label">Strength Score</div>
                    <div class="result-score-val ${data.strength_class}" style="color: ${scoreColor(data.strength_class)}">${data.score} / 7</div>
                </div>
                <div style="text-align:right">
                    <div class="result-score-label">Length</div>
                    <div class="result-score-val" style="color:var(--muted)">${data.length}</div>
                </div>
            </div>
            <ul class="result-feedback-list">
                ${data.feedback.map(f => `<li class="${allGood ? 'feedback-ok' : 'feedback-err'}">${f}</li>`).join('')}
            </ul>
        </div>
    `;
}

function scoreColor(cls) {
    const map = { weak:'var(--red)', medium:'var(--orange)', strong:'var(--green)', 'very-strong':'var(--accent)' };
    return map[cls] || 'var(--text)';
}

function updateCheck(id, pass) {
    const el = document.getElementById(`check-${id}`);
    if (!el) return;
    const labels = {
        length: 'Min 8 characters',
        uppercase: 'Uppercase letter',
        lowercase: 'Lowercase letter',
        number: 'Number (0–9)',
        special: 'Special character',
        no_common: 'No common patterns'
    };
    el.className = `check-item ${pass ? 'pass' : 'fail'}`;
    el.innerHTML = `<span class="check-icon">${pass ? '✓' : '✗'}</span> ${labels[id]}`;
}

function resetPasswordUI() {
    strengthFill.style.width = '0%';
    strengthFill.className = 'strength-fill';
    strengthLabel.textContent = '—';
    strengthLabel.className = 'strength-label';
    ['length','uppercase','lowercase','number','special','no_common'].forEach(id => {
        const el = document.getElementById(`check-${id}`);
        if (el) {
            const labels = { length:'Min 8 characters', uppercase:'Uppercase letter', lowercase:'Lowercase letter', number:'Number (0–9)', special:'Special character', no_common:'No common patterns' };
            el.className = 'check-item';
            el.innerHTML = `<span class="check-icon">○</span> ${labels[id]}`;
        }
    });
    passwordResult.innerHTML = `<div class="result-placeholder"><span class="placeholder-icon">🔐</span><p>Start typing a password to see real-time analysis</p></div>`;
}

// Generate password
generateBtn.addEventListener('click', async () => {
    generateBtn.textContent = '⏳ Generating...';
    generateBtn.disabled = true;
    try {
        const res = await fetch('/api/generate-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ length: parseInt(pwdLength.value) })
        });
        const data = await res.json();
        const pwd = data.password;
        passwordInput.value = pwd;
        passwordInput.type = 'text';
        pwdVisible = true;
        analyzePassword(pwd);

        passwordResult.innerHTML = `
            <div class="password-result-card">
                <div class="result-score-label" style="margin-bottom:0.5rem">Generated Password — click to copy</div>
                <div class="generated-pwd-box" id="genPwdBox">${pwd}</div>
                <p style="font-size:0.78rem;color:var(--muted);margin-top:1.5rem">This password was generated securely. Store it in a password manager.</p>
            </div>
        `;
        document.getElementById('genPwdBox')?.addEventListener('click', () => copyText(pwd, 'Password copied!'));
    } catch(e) {
        showToast('❌ Generation failed');
    } finally {
        generateBtn.textContent = '⚡ Generate Password';
        generateBtn.disabled = false;
    }
});

// ── PDF EXPORTS ───────────────────────────────
async function exportPasswordPdf() {
    if (!currentPasswordData) {
        showToast('⚠ No password data to export');
        console.error('currentPasswordData is null/undefined');
        return;
    }
    try {
        const payload = {
            password: currentPasswordData.password,
            strength: currentPasswordData.strength,
            score: currentPasswordData.score,
            percent: currentPasswordData.percent,
            length: currentPasswordData.length,
            feedback: currentPasswordData.feedback,
            checks: currentPasswordData.checks,
            strength_class: currentPasswordData.strength_class
        };
        console.log('Exporting password data:', payload);
        
        const res = await fetch('/api/export-password-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Export failed:', res.status, errorText);
            throw new Error(`Export failed with status ${res.status}`);
        }
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'password_report.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('✓ PDF exported successfully');
    } catch(e) {
        console.error('PDF export error:', e);
        showToast('❌ PDF export failed: ' + e.message);
    }
}

async function exportHashPdf() {
    if (!currentHashData) {
        showToast('⚠ No hash data to export');
        return;
    }
    try {
        const res = await fetch('/api/export-hash-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentHashData)
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hash_report.pdf';
        a.click();
        showToast('✓ PDF exported successfully');
    } catch(e) {
        showToast('❌ PDF export failed');
    }
}

async function exportIntegrityPdf() {
    if (!currentIntegrityData) {
        showToast('⚠ No integrity data to export');
        return;
    }
    try {
        const res = await fetch('/api/export-integrity-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentIntegrityData)
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'integrity_report.pdf';
        a.click();
        showToast('✓ PDF exported successfully');
    } catch(e) {
        showToast('❌ PDF export failed');
    }
}

// ══════════════════════════════════════════════
//   MODULE 2: FILE HASH GENERATOR
// ══════════════════════════════════════════════

const hashDropZone = document.getElementById('hashDropZone');
const hashFileInput = document.getElementById('hashFileInput');
const hashResults = document.getElementById('hashResults');

let currentHashData = null;

setupDropZone(hashDropZone, hashFileInput, handleHashFile);

async function handleHashFile(file) {
    hashDropZone.querySelector('.drop-icon').textContent = '⏳';
    hashDropZone.querySelector('p').textContent = `Hashing ${file.name}...`;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/hash-file', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.error) { showToast(`❌ ${data.error}`); return; }

        currentHashData = data;
        const sizeStr = formatBytes(data.size);
        document.getElementById('hashFileMeta').innerHTML =
            `<strong>${escHtml(data.filename)}</strong> &nbsp;·&nbsp; ${sizeStr}`;

        document.getElementById('hashTable').innerHTML = [
            { algo: 'MD5',     val: data.md5    },
            { algo: 'SHA-1',   val: data.sha1   },
            { algo: 'SHA-256', val: data.sha256  }
        ].map(({algo, val}) => `
            <div class="hash-row">
                <span class="hash-algo-tag">${algo}</span>
                <span class="hash-value" id="hval-${algo}">${val}</span>
                <button class="copy-btn" title="Copy ${algo}" data-hash="${val}">📋</button>
            </div>
        `).join('');

        hashResults.classList.remove('hidden');

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => copyText(btn.dataset.hash, `${btn.title} hash copied!`));
        });

        hashDropZone.querySelector('.drop-icon').textContent = '✓';
        hashDropZone.querySelector('p').innerHTML = `<strong>${escHtml(file.name)}</strong> hashed successfully`;

    } catch(e) {
        showToast('❌ Hashing failed');
        hashDropZone.querySelector('.drop-icon').textContent = '📁';
        hashDropZone.querySelector('p').innerHTML = `Drop a file here or <label class="file-link" for="hashFileInput">browse</label>`;
    }
}

document.getElementById('copyAllHashes')?.addEventListener('click', () => {
    const rows = document.querySelectorAll('.hash-row');
    const text = Array.from(rows).map(r => {
        const algo = r.querySelector('.hash-algo-tag').textContent;
        const val = r.querySelector('.hash-value').textContent;
        return `${algo}: ${val}`;
    }).join('\n');
    copyText(text, 'All hashes copied!');
});

document.getElementById('exportHashPdf')?.addEventListener('click', exportHashPdf);

document.getElementById('clearHash')?.addEventListener('click', () => {
    hashResults.classList.add('hidden');
    currentHashData = null;
    hashDropZone.querySelector('.drop-icon').textContent = '📁';
    hashDropZone.querySelector('p').innerHTML = `Drop a file here or <label class="file-link" for="hashFileInput">browse</label>`;
    hashFileInput.value = '';
});

// ══════════════════════════════════════════════
//   MODULE 3: FILE INTEGRITY VERIFIER
// ══════════════════════════════════════════════

const verifyDropZone = document.getElementById('verifyDropZone');
const verifyFileInput = document.getElementById('verifyFileInput');
const verifyResult = document.getElementById('verifyResult');
let verifySelectedFile = null;
let currentIntegrityData = null;

setupDropZone(verifyDropZone, verifyFileInput, (file) => {
    verifySelectedFile = file;
    verifyDropZone.querySelector('.drop-icon').textContent = '✓';
    verifyDropZone.querySelector('p').innerHTML = `<strong>${escHtml(file.name)}</strong>`;
});

document.getElementById('verifyBtn').addEventListener('click', async () => {
    if (!verifySelectedFile) { showToast('⚠ Please upload a file first'); return; }
    const expected = document.getElementById('expectedHash').value.trim();
    if (!expected) { showToast('⚠ Please enter an expected hash'); return; }
    const hashType = document.querySelector('input[name="hashType"]:checked').value;

    const btn = document.getElementById('verifyBtn');
    btn.textContent = '⏳ Verifying...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', verifySelectedFile);
    formData.append('expected_hash', expected);
    formData.append('hash_type', hashType);

    try {
        const res = await fetch('/api/verify-integrity', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.error) { showToast(`❌ ${data.error}`); return; }

        const matched = data.matched;
        currentIntegrityData = data;
        verifyResult.innerHTML = `
            <div class="verify-verdict ${matched ? 'verdict-matched' : 'verdict-mismatch'}">
                <div class="verdict-icon">${matched ? '✅' : '❌'}</div>
                <div class="verdict-title">${matched ? 'Hash Matched' : 'Hash Mismatch'}</div>
                <p style="font-size:0.85rem;color:var(--muted);text-align:center">
                    ${matched
                        ? 'The file is intact and unmodified. The hash values match.'
                        : 'The file may have been tampered with or corrupted. Hashes do not match.'}
                </p>
                <div class="verdict-hashes">
                    <div class="vh-row">
                        <span class="vh-label">Algorithm</span>
                        <span class="vh-value">${data.hash_type}</span>
                    </div>
                    <div class="vh-row">
                        <span class="vh-label">Expected Hash</span>
                        <span class="vh-value ${matched ? 'match' : 'mismatch'}">${escHtml(data.expected_hash)}</span>
                    </div>
                    <div class="vh-row">
                        <span class="vh-label">Actual Hash</span>
                        <span class="vh-value ${matched ? 'match' : 'mismatch'}">${data.actual_hash}</span>
                    </div>
                </div>
                <button class="btn btn-ghost" id="exportIntegrityPdf" style="margin-top:1rem;">📄 Export PDF</button>
            </div>
        `;
        
        document.getElementById('exportIntegrityPdf')?.addEventListener('click', exportIntegrityPdf);
    } catch(e) {
        showToast('❌ Verification failed');
    } finally {
        btn.textContent = '🔎 Verify Integrity';
        btn.disabled = false;
    }
});

// ── HELPERS ───────────────────────────────────

function setupDropZone(zone, input, handler) {
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        if (input.files[0]) handler(input.files[0]);
    });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handler(e.dataTransfer.files[0]);
    });
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024**2) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1024**2).toFixed(2)} MB`;
}

function escHtml(str) {
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
