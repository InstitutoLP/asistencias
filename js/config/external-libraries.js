(() => {
  const pendingScripts = new Map();
  const libraries = {
    chart: {
      src: 'https://cdn.jsdelivr.net/npm/chart.js',
      isReady: () => typeof window.Chart !== 'undefined',
    },
    html2canvas: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      isReady: () => typeof window.html2canvas === 'function',
    },
    jsPdf: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      isReady: () => Boolean(window.jspdf?.jsPDF),
    },
    jsZip: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      isReady: () => typeof window.JSZip === 'function',
    },
  };

  const loadLibrary = (name) => {
    const library = libraries[name];
    if (!library) return Promise.reject(new Error(`Librería desconocida: ${name}`));
    if (library.isReady()) return Promise.resolve();
    if (pendingScripts.has(name)) return pendingScripts.get(name);

    const script = document.createElement('script');
    script.src = library.src;
    script.async = true;

    const loading = new Promise((resolve, reject) => {
      script.addEventListener('load', () => {
        if (library.isReady()) {
          resolve();
        } else {
          pendingScripts.delete(name);
          reject(new Error(`La librería ${name} se cargó sin inicializarse.`));
        }
      }, { once: true });
      script.addEventListener('error', () => {
        pendingScripts.delete(name);
        reject(new Error(`No se pudo cargar la librería ${name}.`));
      }, { once: true });
    });

    pendingScripts.set(name, loading);
    document.head.appendChild(script);
    return loading;
  };

  window.loadExternalLibrary = loadLibrary;
  window.loadPdfLibraries = () => Promise.all([
    loadLibrary('html2canvas'),
    loadLibrary('jsPdf'),
  ]);
  window.loadWordLibraries = () => Promise.all([
    loadLibrary('html2canvas'),
    loadLibrary('jsZip'),
  ]);
})();
