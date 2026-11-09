// Iconos SVG estáticos (stroke, 24x24). Solo contienen markup propio: seguro para innerHTML.
const PATHS = {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>',
  music: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  move: '<path d="M5 12h14M13 6l6 6-6 6"/><path d="M3 5v14"/>',
  more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4M19 12H9"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
  prev: '<path d="M6 5v14M19 5v14L9 12z" fill="currentColor"/>',
  next: '<path d="M18 5v14M5 5v14l10-7z" fill="currentColor"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  volume: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
  mute: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="m17 10 4 4M21 10l-4 4"/>',
  install: '<path d="M12 4v10M8 10l4 4 4-4"/><rect x="4" y="16" width="16" height="4" rx="1.5"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  chevronRight: '<path d="m9 5 7 7-7 7"/>',
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  sort: '<path d="M7 5v14M4 16l3 3 3-3M17 19V5M14 8l3-3 3 3"/>',
  shuffle: '<path d="M4 7h3.5c5 0 4 10 9 10H20M4 17h3.5c1.6 0 2.6-1 3.4-2.2M13 9.2C13.8 8 14.9 7 16.5 7H20"/><path d="m18 5 2 2-2 2M18 15l2 2-2 2"/>',
  repeat: '<path d="M5 11V9a2 2 0 0 1 2-2h12M19 13v2a2 2 0 0 1-2 2H5"/><path d="m16 4 3 3-3 3M8 20l-3-3 3-3"/>',
  repeatOne: '<path d="M5 11V9a2 2 0 0 1 2-2h12M19 13v2a2 2 0 0 1-2 2H5"/><path d="m16 4 3 3-3 3M8 20l-3-3 3-3M12 10.5l1.2-.8v5"/>',
  disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  tag: '<path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5l8 8-9 9z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
  share: '<circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="m8.3 10.8 7.4-3.6M8.3 13.2l7.4 3.6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  queue: '<path d="M4 6h12M4 11h12M4 16h7"/><path d="m15 14 5 3-5 3z" fill="currentColor"/>',
  archive: '<rect x="3.5" y="4" width="17" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
  arrowUp: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
  arrowDown: '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>',
  playlist: '<path d="M4 6h11M4 11h11M4 16h6"/><circle cx="17.5" cy="17" r="2.5"/><path d="M20 17V8l-3-1"/>',
  restore: '<path d="M4 12a8 8 0 1 1 2.4 5.7"/><path d="M4 18v-6h6"/>',
  plane: '<path d="M21 4 3 11l6 2.5L11.5 20l3-4.5L19 18z"/><path d="m9 13.5 12-9.5"/>',
};

/** Las funciones (features/*) añaden aquí sus iconos propios. */
export const registerIcons = (map) => Object.assign(PATHS, map);

export function icon(name, extraClass = '') {
  const span = document.createElement('span');
  span.innerHTML = `<svg class="icon ${extraClass}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] ?? PATHS.file}</svg>`;
  return span.firstElementChild;
}

export const kindIcon = (kind) => ({ image: 'image', video: 'video', audio: 'music' }[kind] ?? 'file');
