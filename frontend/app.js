const AUTH_BASE = "http://localhost:8081"
const DRAWING_BASE = "http://localhost:8082";
const IMAGE_BASE = "http://localhost:8083";

const svg = document.getElementById('svgCanvas');
const toolSel = document.getElementById('tool');
const strokeColor = document.getElementById('strokeColor');
const fillColor = document.getElementById('fillColor');
const strokeWidth = document.getElementById('strokeWidth');
const bgFile = document.getElementById('bgFile');
const btnUploadBg = document.getElementById('btnUploadBg');
const btnSave = document.getElementById('btnSave');
const savedList = document.getElementById('savedList');
const btnLoad = document.getElementById('btnLoad');


const btnLogin = document.getElementById('btnLogin');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const btnLogout = document.getElementById('btnLogout');

btnLogin.addEventListener("click", async () => {
    const payload = {
        username: usernameEl.value,
        password: passwordEl.value
    };

    try {
        const res = await fetch(`${AUTH_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            alert("Login failed: " + err.detail);
            return;
        }

        const data = await res.json();
        token = data.access_token;
        localStorage.setItem("token", token);
        btnLogout.style.display = "inline-block";
        alert("Login success!");
    } catch (e) {
        alert("Error: " + e.message);
    }
});

btnRegister.addEventListener("click", async () => {
    const username = usernameEl.value.trim();
    const password = passwordEl.value.trim();

    if (!username || !password) return alert("Missing user or password");

    const res = await fetch(`${AUTH_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
        const e = await res.json();
        return alert("Registration failed: " + (e.detail || "unknown error"));
    }

    alert("User created! Now login.");
});

btnLogout.addEventListener("click", () => {
    token = null;
    localStorage.removeItem("token");
    btnLogout.style.display = "none";
    alert("Logged out");
});

let token = localStorage.getItem('token') || null;
if (token) {
    btnLogout.style.display = 'inline-block';
}

let currentElement = null;
let startX = 0, startY = 0;
let drawing = false;
let polygonPoints = [];

function setAttributes(el, attrs) {
    for (const k in attrs) el.setAttribute(k, attrs[k]);
}

function createSVG(tag, attrs) { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); setAttributes(el, attrs); svg.appendChild(el); return el; }

svg.addEventListener('mousedown', e => {
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
    const y = (e.clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height);
    startX = x; startY = y;
    const tool = toolSel.value;


    if (tool === 'line') {
        currentElement = createSVG('line', { x1: x, y1: y, x2: x, y2: y, stroke: strokeColor.value, 'stroke-width': strokeWidth.value });
        drawing = true;
    } else if (tool === 'rect') {
        currentElement = createSVG('rect', { x: x, y: y, width: 0, height: 0, stroke: strokeColor.value, fill: fillColor.value, 'stroke-width': strokeWidth.value });
        drawing = true;
    } else if (tool === 'circle') {
        currentElement = createSVG('ellipse', { cx: x, cy: y, rx: 0, ry: 0, stroke: strokeColor.value, fill: fillColor.value, 'stroke-width': strokeWidth.value });
        drawing = true;
    } else if (tool === 'polygon') {
        polygonPoints.push([x, y]);
        if (polygonPoints.length === 1) {
            currentElement = createSVG('polyline', { points: `${x},${y}`, stroke: strokeColor.value, fill: 'none', 'stroke-width': strokeWidth.value });
        } else {
            currentElement.setAttribute('points', polygonPoints.map(p => p.join(',')).join(' '));
        }
    }
});

svg.addEventListener('mousemove', e => {
    if (!drawing) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
    const y = (e.clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height);
    const tool = toolSel.value;
    if (tool === 'line') {
        currentElement.setAttribute('x2', x);
        currentElement.setAttribute('y2', y);
    } else if (tool === 'rect') {
        const w = x - startX; const h = y - startY;
        currentElement.setAttribute('x', Math.min(startX, x));
        currentElement.setAttribute('y', Math.min(startY, y));
        currentElement.setAttribute('width', Math.abs(w));
        currentElement.setAttribute('height', Math.abs(h));
    } else if (tool === 'circle') {
        currentElement.setAttribute('rx', Math.abs(x - startX));
        currentElement.setAttribute('ry', Math.abs(y - startY));
    }
});


svg.addEventListener('mouseup', e => {
    drawing = false; currentElement = null;
});

svg.addEventListener('dblclick', e => {
    if (toolSel.value !== 'polygon') return;
    if (polygonPoints.length < 3) { polygonPoints = []; if (currentElement) { currentElement.remove(); currentElement = null; } return; }

    const pointsStr = polygonPoints.map(p => p.join(',')).join(' ');
    const poly = createSVG('polygon', { points: pointsStr, stroke: strokeColor.value, fill: fillColor.value, 'stroke-width': strokeWidth.value });
    if (currentElement) { currentElement.remove(); }
    polygonPoints = []; currentElement = null;
});

function exportDrawing() {
    const nodes = [];
    for (const el of svg.children) {
        const tag = el.tagName;
        const obj = { tag, attrs: {} };
        for (const a of el.attributes) { obj.attrs[a.name] = a.value; }
        nodes.push(obj);
    }
    return { width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, nodes };
}

function importDrawing(data) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
    for (const n of data.nodes) {
        const el = createSVG(n.tag, n.attrs);
    }
}

btnUploadBg.addEventListener('click', async () => {
    if (!bgFile.files.length) return alert('Selecciona un archivo');
    const f = bgFile.files[0];
    const form = new FormData(); form.append('file', f);
    try {
        const res = await fetch(`${IMAGE_BASE}/upload`, {
            method: 'POST', body: form, headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        if (!res.ok) throw new Error('Upload failed');
        const j = await res.json();

        const img = createSVG('image', { href: j.url, x: 0, y: 0, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height });
        img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    } catch (e) { alert('Error al subir: ' + e.message); }
});

btnSave.addEventListener("click", async () => {
    if (!token) return alert("Login first!");

    const name = prompt("Name of the drawing?");
    if (!name) return;

    const data = exportDrawing();

    const res = await fetch(`${DRAWING_BASE}/save?name=${encodeURIComponent(name)}`, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (!res.ok) return alert("Error saving");

    alert("Saved!");
});

btnLoad.addEventListener("click", async () => {
    if (!token) return alert("Login first!");

    const res = await fetch(`${DRAWING_BASE}/list`, {
        headers: { "Authorization": "Bearer " + token }
    });

    const items = await res.json();
    if (items.length === 0) return alert("Nothing saved");

    const id = prompt("Choose ID:\n" + items.map(i => `${i.id}: ${i.name}`).join("\n"));
    if (!id) return;

    const res2 = await fetch(`${DRAWING_BASE}/load/${id}`, {
        headers: { "Authorization": "Bearer " + token }
    });

    if (!res2.ok) return alert("Error loading");

    const drawing = await res2.json();
    importDrawing(drawing);
});
