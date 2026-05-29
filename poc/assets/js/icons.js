/**
 * Company Operation — Premium SVG Icon Library
 * Replaces all emoji with Lucide-style SVG icons
 * Include this BEFORE nav.js on every page
 */

function svgIcon(path, size = 18, color = 'currentColor') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

// ─── Icon Library ───
const I = {
  // Navigation & UI
  dashboard:    svgIcon('<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>'),
  search:       svgIcon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  bell:         svgIcon('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  settings:     svgIcon('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  export:       svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
  calendar:     svgIcon('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'),
  user:         svgIcon('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  logout:       svgIcon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'),
  arrowRight:   svgIcon('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
  check:        svgIcon('<polyline points="20 6 9 17 4 12"/>'),
  x:            svgIcon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  plus:         svgIcon('<path d="M5 12h14"/><path d="M12 5v14"/>'),
  filter:       svgIcon('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'),

  // Business
  folder:       svgIcon('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
  dollar:       svgIcon('<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
  cart:         svgIcon('<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'),
  receipt:      svgIcon('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 10h8"/><path d="M8 14h4"/>'),
  car:          svgIcon('<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'),
  plane:        svgIcon('<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'),
  clock:        svgIcon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  hash:         svgIcon('<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>'),
  chart:        svgIcon('<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'),
  shield:       svgIcon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>'),
  globe:        svgIcon('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
  columns:      svgIcon('<rect width="6" height="14" x="2" y="6" rx="2"/><rect width="6" height="10" x="9" y="2" rx="2"/><rect width="6" height="14" x="16" y="8" rx="2"/>'),
  clipboardList:svgIcon('<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>'),

  // Status
  alertTriangle:svgIcon('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  alertCircle:  svgIcon('<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'),
  trendUp:      svgIcon('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'),
  trendDown:    svgIcon('<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>'),
  sparkles:     svgIcon('<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>'),
  zap:          svgIcon('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),

  // Files
  fileText:     svgIcon('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13h4"/><path d="M10 17h4"/>'),
  paperclip:    svgIcon('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>'),
  upload:       svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>'),
  camera:       svgIcon('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
  creditCard:   svgIcon('<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>'),

  // People
  users:        svgIcon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  milestone:    svgIcon('<path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z"/><path d="M12 13v8"/><path d="M12 3v3"/>'),
};

// Auto-replace emoji in DOM after page loads
document.addEventListener('DOMContentLoaded', () => {
  // Map of HTML entity → SVG replacement
  const replacements = {
    '&#128202;': I.dashboard, '&#128176;': I.dollar, '&#128722;': I.cart,
    '&#129534;': I.receipt, '&#128663;': I.car, '&#9992;': I.plane, '&#65039;': '',
    '&#127769;': I.clock, '&#128290;': I.hash, '&#128200;': I.chart,
    '&#128274;': I.shield, '&#9881;': I.settings, '&#128197;': I.calendar,
    '&#128204;': I.columns, '&#127968;': I.globe, '&#128193;': I.folder,
    '&#129302;': I.sparkles, '&#9203;': I.clock, '&#128229;': I.export,
    '&#128337;': I.clock, '&#128206;': I.paperclip, '&#128179;': I.creditCard,
    '&#128664;': I.car, '&#128665;': I.car, '&#128247;': I.camera,
    '&#128209;': I.fileText, '&#128196;': I.fileText, '&#128203;': I.clipboardList,
    '&#128178;': I.dollar, '&#128100;': I.user, '&#128101;': I.users,
    '&#9888;': I.alertTriangle, '&#127937;': I.milestone, '&#128336;': I.clock,
    '&#128230;': I.cart,
    '&#10010;': I.upload,
  };

  // Replace in UI elements — NOT in data tables
  const selectors = '.card-header h2, .page-header h1, .btn, .rate-card-header, .exp-icon-wrap, .ot-type-icon, .approval-icon-wrap, .upload-area .icon, .timeline-dot, .feature .icon, .receipt-thumb, .vehicle-icon, .travel-dest .icon, .flow-step-circle, .kpi-icon';

  document.querySelectorAll(selectors).forEach(el => {
    let html = el.innerHTML;
    let changed = false;
    for (const [entity, svg] of Object.entries(replacements)) {
      if (html.includes(entity)) {
        html = html.replaceAll(entity, svg);
        changed = true;
      }
    }
    if (changed) el.innerHTML = html;
  });

  // Also replace raw Unicode emoji that aren't HTML entities
  const emojiMap = {
    '🧾': I.receipt, '🛒': I.cart, '💰': I.dollar, '🚗': I.car,
    '✈️': I.plane, '🌙': I.clock, '🔢': I.hash, '📊': I.dashboard,
    '📁': I.folder, '📈': I.chart, '🔐': I.shield, '⚙️': I.settings,
    '📋': I.clipboardList, '📅': I.calendar, '📌': I.columns,
    '🏠': I.globe, '📝': I.fileText, '💬': I.fileText,
    '📆': I.calendar, '👥': I.users, '🔄': I.chart,
    '⚠️': I.alertTriangle, '⏱': I.clock, '📎': I.paperclip,
    '🕐': I.clock, '📦': I.cart, '📥': I.export, '🔍': I.search,
    '🔔': I.bell, '🤖': I.sparkles, '⏳': I.clock,
    '💵': I.dollar, '🧮': I.clipboardList, '🛍': I.cart,
    '🗂': I.folder, '👷': I.user, '👔': I.user,
    '📄': I.fileText, '💳': I.creditCard, '📷': I.camera,
    '🏁': I.milestone, '⚡': I.zap,
  };

  document.querySelectorAll(selectors).forEach(el => {
    let html = el.innerHTML;
    let changed = false;
    for (const [emoji, svg] of Object.entries(emojiMap)) {
      if (html.includes(emoji)) {
        html = html.replaceAll(emoji, svg);
        changed = true;
      }
    }
    if (changed) el.innerHTML = html;
  });
});
