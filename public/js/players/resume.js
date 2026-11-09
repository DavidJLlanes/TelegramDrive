// Guarda la cola y la posición para retomar la música al volver a abrir la aplicación.
// Solo se guardan ids (la cola puede tener miles de pistas); los datos se vuelven a pedir al servidor.
const KEY = 'tgd.resume';

export function saveResume(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
}

export function loadResume() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    return data && Array.isArray(data.ids) && data.ids.length ? data : null;
  } catch { return null; }
}

export const clearResume = () => { try { localStorage.removeItem(KEY); } catch { /* nada */ } };
