// file-app.js - DOM interactions, fraction calculations, and vector blueprint rendering
import { FILE_FORMULA_CONFIG } from './file-formulas.js';

let fileQueue = [];
let currentFileMode = 'letter';
let currentItemMode = 'dovetail';

try {
    const cached = localStorage.getItem('dbs_file_production_queue_v2');
    if (cached) fileQueue = JSON.parse(cached);
} catch (e) {
    console.error("Failed to load cached file configuration parameters", e);
}

function parseFraction(val) {
    if (val === undefined || val === null) return NaN;
    let str = val.toString().trim();
    if (!str) return NaN;
    if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);

    str = str.replace(/-/g, ' ').replace(/\s+/g, ' ');
    const parts = str.split(' ');

    if (parts.length === 2) {
        const whole = parseFloat(parts[0]);
        const fracParts = parts[1].split('/');
        if (fracParts.length === 2) {
            const num = parseFloat(fracParts[0]);
            const den = parseFloat(fracParts[1]);
            if (den !== 0 && !isNaN(whole) && !isNaN(num) && !isNaN(den)) return whole + (num / den);
        }
    } else if (parts.length === 1 && parts[0].includes('/')) {
        const fracParts = parts[0].split('/');
        if (fracParts.length === 2) {
            const num = parseFloat(fracParts[0]);
            const den = parseFloat(fracParts[1]);
            if (den !== 0 && !isNaN(num) && !isNaN(den)) return num / den;
        }
    }
    return parseFloat(str);
}

function fmt(num) {
    if (num === undefined || num === null || isNaN(num)) return "ERROR";
    return parseFloat(parseFloat(num).toFixed(3)).toString();
}

function validateFileInput() {
    const isAutoChecked = document.getElementById('autoRailToggle').checked;
    const manualInputsContainer = document.getElementById('manual-rail-inputs');
    
    if (isAutoChecked) {
        manualInputsContainer.classList.add('hidden');
    } else {
        manualInputsContainer.classList.remove('hidden');
    }

    const baseFields = ['fileQty', 'fileWidth', 'fileDepth', 'fileHeight'];
    if (!isAutoChecked) {
        baseFields.push('leftRailRaw', 'rightRailRaw');
    }

    const frame = document.getElementById('file-display-frame');
    const addBtn = document.getElementById('file-add-btn');
    let isComplete = true;

    baseFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.value.trim() === "") {
            isComplete = false;
        } else {
            const parsed = (id === 'fileQty') ? parseFloat(el.value) : parseFraction(el.value);
            if (isNaN(parsed) || parsed < 0) isComplete = false;
            if (id !== 'fileQty' && parsed <= 0) isComplete = false;
        }
    });

    if (isComplete) {
        const data = {
            width: parseFraction(document.getElementById('fileWidth').value),
            depth: parseFraction(document.getElementById('fileDepth').value),
            height: parseFraction(document.getElementById('fileHeight').value),
            t: parseFloat(document.getElementById('fileThick').value),
            autoRail: isAutoChecked,
            leftRailRaw: isAutoChecked ? 0 : parseFraction(document.getElementById('leftRailRaw').value),
            rightRailRaw: isAutoChecked ? 0 : parseFraction(document.getElementById('rightRailRaw').value)
        };

        const check = FILE_FORMULA_CONFIG.calculateValues(currentFileMode, currentItemMode, data);
        if (!check.isSafe) {
            isComplete = false;
            renderErrorOverlay(check.errorMsg);
        }
    }

    if (isComplete) {
        frame.classList.add('is-live');
        addBtn.disabled = false;
        let btnColor = currentItemMode === 'dovetail' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500';
        addBtn.className = `w-full ${btnColor} text-white font-extrabold py-4 rounded-xl shadow-md transition-all uppercase tracking-widest text-xs cursor-pointer active:scale-[0.99]`;
        updateFilePreview();
    } else {
        frame.classList.remove('is-live');
        addBtn.disabled = true;
        addBtn.className = "w-full bg-slate-100 text-slate-300 font-extrabold py-4 rounded-xl uppercase tracking-widest text-xs cursor-not-allowed border border-slate-200/40 shadow-none";
    }
}

function renderErrorOverlay(msg) {
    const svg = document.getElementById('file-preview-svg');
    if (svg) {
        svg.innerHTML = `<text x="250" y="200" text-anchor="middle" fill="#dc2626" font-weight="800" font-size="12" class="uppercase">${msg}</text>`;
    }
}

function updateFilePreview() {
    const isAutoChecked = document.getElementById('autoRailToggle').checked;
    const data = {
        label: document.getElementById('fileLabel').value || "File Unit",
        qty: parseFloat(document.getElementById('fileQty').value) || 1,
        width: parseFraction(document.getElementById('fileWidth').value),
        depth: parseFraction(document.getElementById('fileDepth').value),
        height: parseFraction(document.getElementById('fileHeight').value),
        t: parseFloat(document.getElementById('fileThick').value),
        autoRail: isAutoChecked,
        leftRailRaw: isAutoChecked ? 0 : parseFraction(document.getElementById('leftRailRaw').value),
        rightRailRaw: isAutoChecked ? 0 : parseFraction(document.getElementById('rightRailRaw').value)
    };
    generateFileSVG(data, 'file-preview-svg', true, currentFileMode, currentItemMode, false);
}

function generateFileSVG(data, svgId, showWood, fileMode, itemMode, isPrint) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const w = data.width; const d = data.depth; const t = data.t;
    const calcs = FILE_FORMULA_CONFIG.calculateValues(fileMode, itemMode, data);
    const { sideLen, leftRailPos, rightRailPos, displayClearance } = calcs;

    const scale = Math.min(380 / w, 260 / d);
    const dW = w * scale; const dD = d * scale; const dT = t * scale;
    const x0 = (500 - dW) / 2; const y0 = (360 - dD) / 2;

    let themeStroke = itemMode === 'dovetail' ? '#c2410c' : '#2563eb';

    let svgInner = `
        <defs>
            <marker id="arr-s-${svgId}" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#000"/></marker>
            <marker id="arr-e-${svgId}" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#000"/></marker>
        </defs>
        <rect x="${x0}" y="${y0}" width="${dW}" height="${dD}" fill="${showWood ? '#dec19e' : 'none'}" stroke="${themeStroke}" stroke-width="2.5"/>
        <rect x="${x0+dT}" y="${y0+dT}" width="${dW-(2*dT)}" height="${dD-(2*dT)}" fill="${showWood ? '#fcf6ed' : 'none'}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" />
    `;

    if (fileMode === 'letter' || fileMode === 'legal') {
        const lx = x0 + (leftRailPos * scale);
        const rx = x0 + (rightRailPos * scale);
        
        svgInner += `
            <line x1="${lx}" y1="${y0+dT}" x2="${lx}" y2="${y0+dD-dT}" stroke="#dc2626" stroke-width="3" />
            <line x1="${rx}" y1="${y0+dT}" x2="${rx}" y2="${y0+dD-dT}" stroke="#dc2626" stroke-width="3" />
            
            <line x1="${lx}" y1="${y0+(dD/2)}" x2="${rx}" y2="${y0+(dD/2)}" stroke="#000" marker-start="url(#arr-s-${svgId})" marker-end="url(#arr-e-${svgId})" />
            <text x="${x0+(dW/2)}" y="${y0+(dD/2)-10}" text-anchor="middle" font-weight="900" font-size="18" fill="#dc2626">${fmt(displayClearance)}" HANG CLEARANCE</text>
            <text x="${x0+dT+10}" y="${y0+dT+20}" font-size="12" font-weight="bold" fill="#475569">Offset: ${fmt(leftRailPos)}"</text>
        `;
    } else if (fileMode === 'lateral') {
        const ly = y0 + (leftRailPos * scale);
        const ry = y0 + (rightRailPos * scale);

        svgInner += `
            <line x1="${x0+dT}" y1="${ly}" x2="${x0+dW-dT}" y2="${ly}" stroke="#dc2626" stroke-width="3" />
            <line x1="${x0+dT}" y1="${ry}" x2="${x0+dW-dT}" y2="${ry}" stroke="#dc2626" stroke-width="3" />
            
            <line x1="${x0+(dW/2)}" y1="${ly}" x2="${x0+(dW/2)}" y2="${ry}" stroke="#000" marker-start="url(#arr-s-${svgId})" marker-end="url(#arr-e-${svgId})" />
            <text x="${x0+(dW/2)+15}" y="${ly+((ry-ly)/2)+5}" text-anchor="start" font-weight="900" font-size="18" fill="#dc2626">${fmt(displayClearance)}" CLEAR</text>
        `;
    }

    if (!isPrint) {
        svgInner += `
            <text x="15" y="30" font-weight="900" font-size="18" class="fill-slate-900">${data.label.toUpperCase()}</text>
            <text x="15" y="52" font-weight="bold" font-size="13" fill="#0f766e">QTY: ${data.qty} | H: ${fmt(data.height)}" | BLANK SIDE: ${fmt(sideLen)}"</text>
        `;
    }

    svgInner += `
        <text x="${x0+(dW/2)}" y="${y0+dD+22}" text-anchor="middle" font-weight="bold" font-size="15">W = ${fmt(w)}"</text>
        <text x="${x0-20}" y="${y0+(dD/2)}" text-anchor="middle" font-weight="bold" font-size="15" transform="rotate(-90, ${x0-20}, ${y0+(dD/2)})">D = ${fmt(d)}"</text>
    `;

    svg.innerHTML = svgInner;
}

function addFileToQueue() {
    const sel = document.getElementById('fileThick');
    const isAutoChecked = document.getElementById('autoRailToggle').checked;
    
    const item = {
        id: 'FL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        fileMode: currentFileMode,
        itemMode: currentItemMode,
        label: document.getElementById('fileLabel').value || 'File Run',
        qty: parseFloat(document.getElementById('fileQty').value) || 1,
        width: parseFraction(document.getElementById('fileWidth').value),
        depth: parseFraction(document.getElementById('fileDepth').value),
        height: parseFraction(document.getElementById('fileHeight').value),
        t: parseFloat(sel.value),
        tName: sel.options[sel.selectedIndex].text,
        autoRail: isAutoChecked,
        leftRailRaw: isAutoChecked ? 0 : parseFraction(document.getElementById('leftRailRaw').value),
        rightRailRaw: isAutoChecked ? 0 : parseFraction(document.getElementById('rightRailRaw').value)
    };

    fileQueue.push(item);
    localStorage.setItem('dbs_file_production_queue_v2', JSON.stringify(fileQueue));
    renderFileQueue();
    resetFileForm();
}

function renderFileQueue() {
    const list = document.getElementById('file-queue-list');
    if (!list) return;
    list.innerHTML = "";

    fileQueue.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-sm shadow-sm font-medium";
        
        let typeBadgeColor = item.itemMode === 'dovetail' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';
        
        row.innerHTML = `
            <span class="text-slate-700"><b>${idx+1}. ${item.label}</b> 
                <span class="text-[10px] ml-1.5 px-2 py-0.5 rounded-md ${typeBadgeColor} font-black">${item.itemMode.toUpperCase()} ${item.fileMode.toUpperCase()}</span>
            </span>
            <button onclick="removeFileItem('${item.id}')" class="text-rose-600 font-bold uppercase text-[10px] hover:underline tracking-wider">Delete</button>
        `;
        list.appendChild(row);
    });
}

function removeFileItem(id) {
    fileQueue = fileQueue.filter(i => i.id !== id);
    localStorage.setItem('dbs_file_production_queue_v2', JSON.stringify(fileQueue));
    renderFileQueue();
}

function clearFileQueue() {
    if (confirm("Purge entire file drawer batch queue?")) {
        fileQueue = [];
        localStorage.removeItem('dbs_file_production_queue_v2');
        renderFileQueue();
    }
}

function resetFileForm() {
    document.getElementById('fileLabel').value = "";
    document.getElementById('fileQty').value = "";
    document.getElementById('fileWidth').value = "";
    document.getElementById('fileDepth').value = "";
    document.getElementById('fileHeight').value = "";
    document.getElementById('leftRailRaw').value = "";
    document.getElementById('rightRailRaw').value = "";
    document.getElementById('fileThick').selectedIndex = 0;
    document.getElementById('autoRailToggle').checked = true;
    validateFileInput();
}

function setFileMode(mode) {
    currentFileMode = mode;
    updateFileTabs();
    validateFileInput();
}

function setBoxJointMode(mode) {
    currentItemMode = mode;
    updateFileTabs();
    validateFileInput();
}

function updateFileTabs() {
    const chip = document.getElementById('file-status-chip');
    const title = document.getElementById('file-header-title');
    
    const inactiveBtn = 'py-2 rounded-md text-[9px] font-black uppercase transition-all text-slate-500 hover:text-slate-700 hover:bg-white/50 text-center';
    
    document.getElementById('btn-letter').className = inactiveBtn;
    document.getElementById('btn-legal').className = inactiveBtn;
    document.getElementById('btn-lateral').className = inactiveBtn;
    document.getElementById(`btn-${currentFileMode}`).className = 'py-2 rounded-md text-[9px] font-black uppercase transition-all text-white shadow-sm text-center bg-teal-600';

    document.getElementById('btn-joint-dovetail').className = inactiveBtn;
    document.getElementById('btn-joint-dowel').className = inactiveBtn;
    
    let activeJointColor = currentItemMode === 'dovetail' ? 'bg-orange-600' : 'bg-blue-600';
    document.getElementById(`btn-joint-${currentItemMode}`).className = `py-2 rounded-md text-[9px] font-black uppercase transition-all text-white shadow-sm text-center ${activeJointColor}`;
    
    title.textContent = `${currentItemMode.toUpperCase()} / ${currentFileMode.toUpperCase()} FILE MATRIX`;
    chip.textContent = `Active: ${currentItemMode.toUpperCase()} + ${currentFileMode.toUpperCase()}`;
}

window.validateFileInput = validateFileInput;
window.setFileMode = setFileMode;
window.setBoxJointMode = setBoxJointMode;
window.addFileToQueue = addFileToQueue;
window.removeFileItem = removeFileItem;
window.clearFileQueue = clearFileQueue;
window.resetFileForm = resetFileForm;

window.onload = function() {
    renderFileQueue();
    validateFileInput();
};