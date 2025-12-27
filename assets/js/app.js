// Génération de QR + overlay logo + téléchargement
const form = document.getElementById('qr-form');
const textInput = document.getElementById('qr-text');
const logoInput = document.getElementById('qr-logo');
const sizeSelect = document.getElementById('qr-size-select');
// Le select se transformera en input lorsqu'on choisit "Autre…"
const formatSelect = document.getElementById('qr-format');
const borderInput = document.getElementById('qr-border');
const ratioInput = document.getElementById('qr-logo-ratio');
const ratioMinusBtn = document.getElementById('qr-logo-minus');
const ratioPlusBtn = document.getElementById('qr-logo-plus');
const ratioDisplay = document.getElementById('qr-logo-ratio-display');
const bodyShapeSelect = document.getElementById('qr-body-shape');
const finderOutlineSelect = document.getElementById('qr-finder-outline');
const finderCenterSelect = document.getElementById('qr-finder-center');

function clampLogoRatio(r) {
  return Math.max(0.1, Math.min(0.5, r));
}

function updateLogoRatioDisplay() {
  const val = Number(ratioInput.value) || 0.27;
  const pct = Math.round(val * 100);
  if (ratioDisplay) ratioDisplay.textContent = pct + '%';
}
const darkColorInput = document.getElementById('qr-color-dark');
const lightColorInput = document.getElementById('qr-color-light');
const canvas = document.getElementById('qr-canvas');
const downloadBtn = document.getElementById('download-btn');
const statusEl = document.getElementById('status');

// Mémoire des derniers paramètres pour export
let lastText = '';
let lastSize = 1024;
let lastBorder = 2;
let lastLogoRatio = 0.27;
let lastLogoFile = null;
let lastDarkColor = '#000000';
let lastLightColor = '#ffffff';
let lastBodyShape = 'square';
let lastFinderOutline = 'square';
let lastFinderCenter = 'square';

function setStatus(msg) {
  statusEl.textContent = msg || '';
}

function updateDownloadLabel() {
  const fmt = formatSelect.value;
  if (fmt === 'jpeg') {
    downloadBtn.textContent = 'Télécharger JPEG';
  } else if (fmt === 'svg') {
    downloadBtn.textContent = 'Télécharger SVG';
  } else {
    downloadBtn.textContent = 'Télécharger PNG';
  }
}

function getSelectedSize() {
  const input = document.getElementById('qr-size-input');
  if (input) {
    const n = Number(input.value) || 1024;
    return Math.max(256, Math.min(4096, n));
  }
  const val = sizeSelect.value;
  return Number(val);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Lecture du logo impossible'));
    reader.readAsDataURL(file);
  });
}

async function fileToPNGDataURL(file, targetSize) {
  // Charge le fichier comme image puis ré-encode en PNG via canvas
  const dataUrl = await readFileAsDataURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.max(1, Number(targetSize) || img.naturalWidth);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Remplir fond blanc pour éviter transparences inattendues
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      // Dessiner l'image en s'adaptant au carré
      ctx.drawImage(img, 0, 0, size, size);
      try {
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Le logo ne peut pas être converti en PNG.'));
    img.src = dataUrl;
  });
}

function createRoundedRectPath(doc, x, y, w, h, r) {
  const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('rx', String(r));
  rect.setAttribute('ry', String(r));
  return rect;
}

async function buildSVG(text, size, border, logoFile, logoRatio, darkColor, lightColor, bodyShape, finderOutline, finderCenter) {
  // Helper to build finder overlay in given document
  const appendFinderSvg = (doc, svg, marginPx, modulePx, size, darkColor, finderOutline, finderCenter) => {
    const fpSize = 7 * modulePx;
    const centerSize = 3 * modulePx;
    const centerOffset = 2 * modulePx;
    const strokeWidth = Math.max(1, Math.floor(modulePx / 2));
    const drawFinderSvg = (x, y) => {
      // Outline
      if (finderOutline && finderOutline !== 'default') {
        if (finderOutline === 'circle') {
          const circ = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circ.setAttribute('cx', String(x + fpSize / 2));
          circ.setAttribute('cy', String(y + fpSize / 2));
          circ.setAttribute('r', String(fpSize / 2));
          circ.setAttribute('fill', 'none');
          circ.setAttribute('stroke', darkColor || '#000000');
          circ.setAttribute('stroke-width', String(strokeWidth));
          svg.appendChild(circ);
        } else if (finderOutline === 'rounded') {
          const rxy = Math.max(0, Math.min(fpSize / 2, fpSize * 0.12));
          const rect = createRoundedRectPath(doc, x, y, fpSize, fpSize, rxy);
          rect.setAttribute('fill', 'none');
          rect.setAttribute('stroke', darkColor || '#000000');
          rect.setAttribute('stroke-width', String(strokeWidth));
          svg.appendChild(rect);
        } else if (finderOutline === 'square') {
          const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(x));
          rect.setAttribute('y', String(y));
          rect.setAttribute('width', String(fpSize));
          rect.setAttribute('height', String(fpSize));
          rect.setAttribute('fill', 'none');
          rect.setAttribute('stroke', darkColor || '#000000');
          rect.setAttribute('stroke-width', String(strokeWidth));
          svg.appendChild(rect);
        }
      }

      // Center
      if (finderCenter && finderCenter !== 'default') {
        const cx = x + centerOffset;
        const cy = y + centerOffset;
        if (finderCenter === 'circle') {
          const circ2 = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circ2.setAttribute('cx', String(cx + centerSize / 2));
          circ2.setAttribute('cy', String(cy + centerSize / 2));
          circ2.setAttribute('r', String(centerSize / 2));
          circ2.setAttribute('fill', darkColor || '#000000');
          svg.appendChild(circ2);
        } else if (finderCenter === 'rounded') {
          const cr = Math.max(0, Math.min(centerSize / 2, centerSize * 0.2));
          const rect2 = createRoundedRectPath(doc, cx, cy, centerSize, centerSize, cr);
          rect2.setAttribute('fill', darkColor || '#000000');
          svg.appendChild(rect2);
        } else if (finderCenter === 'square') {
          const rect2 = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect2.setAttribute('x', String(cx));
          rect2.setAttribute('y', String(cy));
          rect2.setAttribute('width', String(centerSize));
          rect2.setAttribute('height', String(centerSize));
          rect2.setAttribute('fill', darkColor || '#000000');
          svg.appendChild(rect2);
        }
      }
    };

    drawFinderSvg(marginPx, marginPx);
    drawFinderSvg(size - marginPx - fpSize, marginPx);
    drawFinderSvg(marginPx, size - marginPx - fpSize);
  };

  // If default body shape: use library SVG directly
  if (bodyShape === 'default') {
    const svgString = await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      width: size,
      margin: border,
      color: { dark: darkColor || '#000000', light: lightColor || '#ffffff' }
    });
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.documentElement;
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
    const modulesCount = qr.modules.size;
    const modulePx = size / (modulesCount + border * 2);
    const marginPx = border * modulePx;

    // Logo background + image
    const logoSize = Math.floor(size * logoRatio);
    const lx = Math.floor((size - logoSize) / 2);
    const ly = Math.floor((size - logoSize) / 2);
    const under = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    under.setAttribute('x', String(lx));
    under.setAttribute('y', String(ly));
    under.setAttribute('width', String(logoSize));
    under.setAttribute('height', String(logoSize));
    under.setAttribute('fill', lightColor || '#ffffff');
    svg.appendChild(under);
    if (logoFile) {
      const dataUrl = await fileToPNGDataURL(logoFile, logoSize);
      const image = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.setAttribute('href', dataUrl);
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl);
      image.setAttribute('x', String(lx));
      image.setAttribute('y', String(ly));
      image.setAttribute('width', String(logoSize));
      image.setAttribute('height', String(logoSize));
      image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      image.setAttribute('image-rendering', 'optimizeQuality');
      svg.appendChild(image);
    }

    // Finder overlay if requested
    appendFinderSvg(doc, svg, marginPx, modulePx, size, darkColor, finderOutline, finderCenter);

    const xml = new XMLSerializer().serializeToString(doc);
    return new Blob([xml], { type: 'image/svg+xml' });
  }

  // Non-default: build from scratch with custom body shape
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const modulesCount = qr.modules.size;
  const modulePx = size / (modulesCount + border * 2);
  const marginPx = border * modulePx;

  const doc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', null);
  const svg = doc.documentElement;
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Background
  const bg = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', String(size));
  bg.setAttribute('height', String(size));
  bg.setAttribute('fill', lightColor || '#ffffff');
  svg.appendChild(bg);

  // Modules with shape
  for (let r = 0; r < modulesCount; r++) {
    for (let c = 0; c < modulesCount; c++) {
      if (!qr.modules.get(r, c)) continue;
      const x = Math.floor(marginPx + c * modulePx);
      const y = Math.floor(marginPx + r * modulePx);
      if (bodyShape === 'circle') {
        const circ = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circ.setAttribute('cx', String(x + modulePx / 2));
        circ.setAttribute('cy', String(y + modulePx / 2));
        circ.setAttribute('r', String(modulePx / 2));
        circ.setAttribute('fill', darkColor || '#000000');
        svg.appendChild(circ);
      } else if (bodyShape === 'rounded') {
        const rxy = Math.max(0, Math.min(modulePx / 2, modulePx * 0.3));
        const rect = createRoundedRectPath(doc, x, y, modulePx, modulePx, rxy);
        rect.setAttribute('fill', darkColor || '#000000');
        svg.appendChild(rect);
      } else { // square
        const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', String(modulePx));
        rect.setAttribute('height', String(modulePx));
        rect.setAttribute('fill', darkColor || '#000000');
        svg.appendChild(rect);
      }
    }
  }

  // Logo area
  const logoSize = Math.floor(size * logoRatio);
  const lx = Math.floor((size - logoSize) / 2);
  const ly = Math.floor((size - logoSize) / 2);
  const under = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  under.setAttribute('x', String(lx));
  under.setAttribute('y', String(ly));
  under.setAttribute('width', String(logoSize));
  under.setAttribute('height', String(logoSize));
  under.setAttribute('fill', lightColor || '#ffffff');
  svg.appendChild(under);
  if (logoFile) {
    const dataUrl = await fileToPNGDataURL(logoFile, logoSize);
    const image = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', dataUrl);
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl);
    image.setAttribute('x', String(lx));
    image.setAttribute('y', String(ly));
    image.setAttribute('width', String(logoSize));
    image.setAttribute('height', String(logoSize));
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    image.setAttribute('image-rendering', 'optimizeQuality');
    svg.appendChild(image);
  }

  // Finder overlay
  appendFinderSvg(doc, svg, marginPx, modulePx, size, darkColor, finderOutline, finderCenter);

  const xml = new XMLSerializer().serializeToString(svg);
  return new Blob([xml], { type: 'image/svg+xml' });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateQR(text, size, border, darkColor, lightColor, bodyShape) {
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = lightColor || '#fff';
  ctx.fillRect(0, 0, size, size);
  // If default shape, use library renderer for exact look
  if (bodyShape === 'default') {
    await QRCode.toCanvas(canvas, text, {
      errorCorrectionLevel: 'H',
      width: size,
      margin: border,
      color: { dark: darkColor || '#000000', light: lightColor || '#ffffff' }
    });
    return;
  }

  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const modulesCount = qr.modules.size;
  const modulePx = size / (modulesCount + border * 2);
  const marginPx = border * modulePx;

  ctx.fillStyle = darkColor || '#000000';
  for (let r = 0; r < modulesCount; r++) {
    for (let c = 0; c < modulesCount; c++) {
      if (!qr.modules.get(r, c)) continue;
      const x = Math.floor(marginPx + c * modulePx);
      const y = Math.floor(marginPx + r * modulePx);
      if (bodyShape === 'circle') {
        ctx.beginPath();
        ctx.arc(x + modulePx / 2, y + modulePx / 2, modulePx / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (bodyShape === 'rounded') {
        const rxy = Math.max(0, Math.min(modulePx / 2, modulePx * 0.3));
        drawRoundedRect(ctx, x, y, modulePx, modulePx, rxy);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, modulePx, modulePx);
      }
    }
  }
}

function drawLogoOverCanvas(file, logoRatio, lightColor) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      const size = canvas.width;
      const logoSize = Math.floor(size * logoRatio);
      const x = Math.floor((size - logoSize) / 2);
      const y = Math.floor((size - logoSize) / 2);

  // Fond derrière le logo (couleur de fond choisie)
  ctx.fillStyle = lightColor || '#ffffff';
      ctx.fillRect(x, y, logoSize, logoSize);

      // Dessin du logo redimensionné
      ctx.drawImage(img, x, y, logoSize, logoSize);
      setStatus('Logo appliqué au centre.');
    };
    img.onerror = () => setStatus('Le fichier logo n\u2019est pas une image valide.');
    img.src = reader.result;
  };
  reader.onerror = () => setStatus('Impossible de lire le fichier logo.');
  reader.readAsDataURL(file);
}

function drawFinderPatterns(textOrPlaceholder, size, border, outlineShape, centerShape, darkColor) {
  try {
    const ctx = canvas.getContext('2d');
    const qr = QRCode.create(textOrPlaceholder, { errorCorrectionLevel: 'H' });
    const modulesCount = qr.modules.size;
    const modulePx = size / (modulesCount + border * 2);
    const marginPx = border * modulePx;

    // Taille standard du motif de repère: 7 modules
    const fpSize = 7 * modulePx;
    const centerSize = 3 * modulePx;
    const centerOffset = 2 * modulePx;

    // If both shapes are default, don't draw any overlay
    if ((outlineShape === 'default' || !outlineShape) && (centerShape === 'default' || !centerShape)) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = darkColor || 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1, Math.floor(modulePx / 2));
    ctx.setLineDash([]); // pas de pointillés

    const drawOne = (x, y) => {
      // Contour
      if (outlineShape === 'circle') {
        ctx.beginPath();
        ctx.arc(x + fpSize / 2, y + fpSize / 2, fpSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (outlineShape === 'rounded') {
        const rxy = Math.max(0, Math.min(fpSize / 2, fpSize * 0.12));
        drawRoundedRect(ctx, x, y, fpSize, fpSize, rxy);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, fpSize, fpSize);
      }

      // Centre
      ctx.fillStyle = darkColor || '#000000';
      const cx = x + centerOffset;
      const cy = y + centerOffset;
      if (centerShape === 'circle') {
        ctx.beginPath();
        ctx.arc(cx + centerSize / 2, cy + centerSize / 2, centerSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (centerShape === 'rounded') {
        const cr = Math.max(0, Math.min(centerSize / 2, centerSize * 0.2));
        drawRoundedRect(ctx, cx, cy, centerSize, centerSize, cr);
        ctx.fill();
      } else {
        ctx.fillRect(cx, cy, centerSize, centerSize);
      }
    };

    // Haut-gauche
    drawOne(marginPx, marginPx);
    // Haut-droite
    drawOne(size - marginPx - fpSize, marginPx);
    // Bas-gauche
    drawOne(marginPx, size - marginPx - fpSize);

    ctx.restore();
  } catch (e) {
    console.debug('Finder overlay error:', e);
  }
}

async function regenerate() {
  setStatus('');

  const text = (textInput.value || '').trim();
  const size = getSelectedSize();
  const border = Math.max(0, Math.min(10, Number(borderInput.value) || 2));
  const logoRatio = Math.max(0.1, Math.min(0.5, Number(ratioInput.value) || 0.27));
  const logoFile = logoInput.files?.[0];
  const darkColor = (darkColorInput.value || '#000000').trim();
  const lightColor = (lightColorInput.value || '#ffffff').trim();
  const bodyShape = (bodyShapeSelect?.value || 'square');
  const finderOutline = (finderOutlineSelect?.value || 'square');
  const finderCenter = (finderCenterSelect?.value || 'square');

  if (darkColor.toLowerCase() === lightColor.toLowerCase()) {
    setStatus('Les couleurs du code et du fond doivent être différentes.');
    return;
  }

  try {
    if (!text) {
      // Canvas vide + repères affichés
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = lightColor || '#fff';
      ctx.fillRect(0, 0, size, size);
      // Utilise un placeholder pour calculer l’échelle des repères
  drawFinderPatterns('placeholder', size, border, finderOutline, finderCenter, darkColor);
      // Afficher le logo immédiatement si sélectionné, même sans texte
      if (logoFile) {
        drawLogoOverCanvas(logoFile, logoRatio, lightColor);
      }
      downloadBtn.disabled = true;
      updateDownloadLabel();
      setStatus('Repères affichés.');
      return;
    }

  await generateQR(text, size, border, darkColor, lightColor, bodyShape);
  drawFinderPatterns(text, size, border, finderOutline, finderCenter, darkColor);
    if (logoFile) {
      drawLogoOverCanvas(logoFile, logoRatio, lightColor);
    }
    downloadBtn.disabled = false;
    updateDownloadLabel();
    setStatus('QR généré.');

    // Mémoriser pour export
    lastText = text;
    lastSize = size;
    lastBorder = border;
    lastLogoRatio = logoRatio;
    lastLogoFile = logoFile || null;
    lastDarkColor = darkColor;
  lastLightColor = lightColor;
  lastBodyShape = bodyShape;
  lastFinderOutline = finderOutline;
  lastFinderCenter = finderCenter;
  } catch (err) {
    console.error(err);
    setStatus('Erreur lors de la génération du QR.');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await regenerate();
});

downloadBtn.addEventListener('click', () => {
  const fmt = formatSelect.value;
  if (fmt === 'png' || fmt === 'jpeg') {
    const type = fmt === 'png' ? 'image/png' : 'image/jpeg';
    const quality = fmt === 'jpeg' ? 0.92 : undefined;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fmt === 'png' ? 'qr_code.png' : 'qr_code.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, type, quality);
  } else if (fmt === 'svg') {
    (async () => {
      try {
        const blob = await buildSVG(lastText, lastSize, lastBorder, lastLogoFile, lastLogoRatio, lastDarkColor, lastLightColor, lastBodyShape, lastFinderOutline, lastFinderCenter);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qr_code.svg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        setStatus('Export SVG échoué.');
      }
    })();
  }
});

// Transformer le select en input quand "Autre…" est sélectionné
sizeSelect.addEventListener('change', () => {
  if (sizeSelect.value === 'other') {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'qr-size-input';
    input.min = '256';
    input.max = '4096';
    input.step = '64';
    input.placeholder = '1024';
    input.value = '1024';
    // Remplace le select par l'input dans le même label
    const parent = sizeSelect.parentElement;
    parent.replaceChild(input, sizeSelect);
    input.addEventListener('input', regenerate);
  }
  regenerate();
});

// Mettre à jour le label du bouton selon le format sélectionné
formatSelect.addEventListener('change', updateDownloadLabel);
updateDownloadLabel();

// Mise à jour en direct de l’aperçu
textInput.addEventListener('input', regenerate);
logoInput.addEventListener('change', regenerate);
borderInput.addEventListener('input', regenerate);
ratioInput.addEventListener('input', regenerate);
darkColorInput.addEventListener('input', regenerate);
lightColorInput.addEventListener('input', regenerate);
bodyShapeSelect?.addEventListener('change', regenerate);
finderOutlineSelect?.addEventListener('change', regenerate);
finderCenterSelect?.addEventListener('change', regenerate);

// Contrôles +/- pour le ratio du logo
if (ratioMinusBtn && ratioPlusBtn) {
  ratioMinusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = Number(ratioInput.value) || 0.27;
    const next = clampLogoRatio(Number((current - 0.01).toFixed(2)));
    ratioInput.value = next.toFixed(2);
    updateLogoRatioDisplay();
    regenerate();
  });

  ratioPlusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = Number(ratioInput.value) || 0.27;
    const next = clampLogoRatio(Number((current + 0.01).toFixed(2)));
    ratioInput.value = next.toFixed(2);
    updateLogoRatioDisplay();
    regenerate();
  });
}

// Affichage initial du ratio
updateLogoRatioDisplay();

// Dessiner immédiatement l'aperçu (repères visibles si texte vide)
regenerate();
