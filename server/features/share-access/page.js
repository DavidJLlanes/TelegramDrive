// Página de contraseña de un enlace compartido (HTML mínimo; estilos externos por la CSP).
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderGate({ base, token, label, error = '' }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Enlace protegido</title>
<link rel="stylesheet" href="${esc(base)}/css/fonts.css"><link rel="stylesheet" href="${esc(base)}/css/tokens.css">
<link rel="stylesheet" href="${esc(base)}/css/base.css"><link rel="stylesheet" href="${esc(base)}/css/share-gate.css"></head>
<body><main class="gate"><h1>Enlace protegido</h1>
<p>«${esc(label)}» necesita una contraseña.</p>
<form method="post" action="${esc(base)}/share/${esc(token)}/unlock">
<input class="input" type="password" name="password" placeholder="Contraseña" autocomplete="off" autofocus required>
<button class="btn btn-primary" type="submit">Abrir</button></form>
${error ? `<p class="gate-error" role="alert">${esc(error)}</p>` : ''}
</main></body></html>`;
}
