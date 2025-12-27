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

async function buildSVG(text, size, border, logoFile, logoRatio, darkColor, lightColor) {
  // Générer XML SVG du QR
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

  // S'assurer des dimensions explicites
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Namespace pour xlink (compatibilité avec lecteurs SVG)
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const logoSize = Math.floor(size * logoRatio);
  const x = Math.floor((size - logoSize) / 2);
  const y = Math.floor((size - logoSize) / 2);

  // Fond sous le logo (comme sur le canvas)
  const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(logoSize));
  rect.setAttribute('height', String(logoSize));
  rect.setAttribute('fill', lightColor || '#ffffff');
  svg.appendChild(rect);

  if (logoFile) {
    const dataUrl = await fileToPNGDataURL(logoFile, logoSize);
    const image = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
    // Définir href pour SVG2 et xlink:href pour compatibilité
    image.setAttribute('href', dataUrl);
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl);
    image.setAttribute('x', String(x));
    image.setAttribute('y', String(y));
    image.setAttribute('width', String(logoSize));
    image.setAttribute('height', String(logoSize));
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    image.setAttribute('image-rendering', 'optimizeQuality');
    svg.appendChild(image);
  }

  const xml = new XMLSerializer().serializeToString(doc);
  return new Blob([xml], { type: 'image/svg+xml' });
}

async function generateQR(text, size, border, darkColor, lightColor) {
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = lightColor || '#fff';
  ctx.fillRect(0, 0, size, size);

  await QRCode.toCanvas(canvas, text, {
    errorCorrectionLevel: 'H',
    width: size,
    margin: border,
    color: { dark: darkColor || '#000000', light: lightColor || '#ffffff' }
  });
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

function drawFinderPatterns(textOrPlaceholder, size, border) {
  try {
    const ctx = canvas.getContext('2d');
    const qr = QRCode.create(textOrPlaceholder, { errorCorrectionLevel: 'H' });
    const modulesCount = qr.modules.size;
    const modulePx = size / (modulesCount + border * 2);
    const marginPx = border * modulePx;

    // Taille standard du motif de repère: 7 modules
    const fpSize = 7 * modulePx;

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; // contours sobres
    ctx.lineWidth = Math.max(1, Math.floor(modulePx / 2));
    ctx.setLineDash([]); // pas de pointillés

    // Haut-gauche
    ctx.strokeRect(marginPx, marginPx, fpSize, fpSize);
    // Haut-droite
    ctx.strokeRect(size - marginPx - fpSize, marginPx, fpSize, fpSize);
    // Bas-gauche
    ctx.strokeRect(marginPx, size - marginPx - fpSize, fpSize, fpSize);

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
      drawFinderPatterns('placeholder', size, border);
      // Afficher le logo immédiatement si sélectionné, même sans texte
      if (logoFile) {
        drawLogoOverCanvas(logoFile, logoRatio, lightColor);
      }
      downloadBtn.disabled = true;
      updateDownloadLabel();
      setStatus('Repères affichés.');
      return;
    }

    await generateQR(text, size, border, darkColor, lightColor);
    drawFinderPatterns(text, size, border);
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
  const blob = await buildSVG(lastText, lastSize, lastBorder, lastLogoFile, lastLogoRatio, lastDarkColor, lastLightColor);
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
