// Iconos extra para personalizar carpetas (stroke, 24x24). Solo markup propio: seguro para innerHTML.
// (camera, chart, lock, pin y shield ya existen en features/icons.js y se reutilizan.)
import { registerIcons } from './icons.js';

registerIcons({
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  film: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 8h16M4 16h16M8 3.5v17M16 3.5v17"/>',
  gift: '<rect x="3.5" y="9.5" width="17" height="11" rx="1.5"/><path d="M3 9.5h18V7H3zM12 7v13.5M12 7c-1-3-5-3.5-5-1.5 0 1.5 3 1.5 5 1.5zM12 7c1-3 5-3.5 5-1.5 0 1.5-3 1.5-5 1.5z"/>',
  cart: '<path d="M3 4h2.5l2 11h10l2-8H7"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  euro: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5A4.5 4.5 0 0 0 8 10.5v3a4.5 4.5 0 0 0 7.5 2M6.5 11h6M6.5 13.5h6"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  key: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5 19 4M16 7l2.5 2.5M14 9l2 2"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  rocket: '<path d="M12 3c3.5 2 5 6 4.5 10h-9C7 9 8.5 5 12 3z"/><circle cx="12" cy="9.5" r="1.5"/><path d="m7.5 13-2.5 3.5 3 .5M16.5 13l2.5 3.5-3 .5M10 17.5 12 21l2-3.5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  bookmark: '<path d="M6.5 3.5h11V21L12 17l-5.5 4z"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1l-5.8 5.8a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.1-5.4l-2.5 2.5-2.2-.5-.5-2.2z"/>',
  paw: '<circle cx="7" cy="11" r="1.8"/><circle cx="10.5" cy="7" r="1.8"/><circle cx="15" cy="7" r="1.8"/><circle cx="18" cy="11.5" r="1.8"/><path d="M12 12.5c-3 0-5 3-5 5 0 1.7 1.5 2 3 1.5s3.5-.5 5 0 3 .2 3-1.5c0-2-2-5-6-5z"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-15 15z"/><path d="M5 19c3-5 6-8 10-10"/>',
  coffee: '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M11.5 3.5v2"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2.5M20 16v2.5"/><circle cx="8" cy="13.5" r="1"/><circle cx="16" cy="13.5" r="1"/>',
  cap: '<path d="m2.5 9.5 9.5-4.5 9.5 4.5-9.5 4.5z"/><path d="M6.5 12v4c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4M21.5 9.5V15"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
});
