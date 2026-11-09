// Registro de vistas. Cada función de la aplicación (features/<nombre>/) registra aquí sus pantallas y el router,
// el menú lateral, la cabecera y el pintado las encuentran sin conocerlas.
//
// view = {
//   id,                       // segmento de la URL: #!/<id>/<partes…>
//   label, icon, group,       // entrada de menú: group 'library' | 'more' (omitir para no mostrarla)
//   title(page) → string, sub?(page) → string, tools?(page) → Node[],   // cabecera
//   load?(parts) → Promise<data>,                                       // datos (se repite al recargar)
//   render(container, page),                                            // pintado: page = { id, parts, loading, data, error }
// }
const registry = new Map();

export const registerView = (view) => { registry.set(view.id, view); return view; };
export const getView = (id) => registry.get(id);
export const menuViews = (group) => [...registry.values()].filter((v) => v.group === group);

export const viewHash = (id, ...parts) => `#!/${[id, ...parts].map(encodeURIComponent).join('/')}`;
export const navigateView = (id, ...parts) => { location.hash = viewHash(id, ...parts); };
