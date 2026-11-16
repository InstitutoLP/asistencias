(() => {
  const API_MATERIALS = window.APP_CONFIG.api.academicMaterials;
  const form = document.getElementById('materialForm');
  const titleInput = document.getElementById('materialTitle');
  const categorySelect = document.getElementById('materialCategory');
  const yearSelect = document.getElementById('materialYear');
  const subjectInput = document.getElementById('materialSubject');
  const fileInput = document.getElementById('materialFile');
  const fileDrop = document.getElementById('fileDrop');
  const fileName = document.getElementById('fileName');
  const uploadButton = document.getElementById('uploadButton');
  const uploadStatus = document.getElementById('uploadStatus');
  const materialFilter = document.getElementById('materialFilter');
  const materialList = document.getElementById('materialList');
  const listStatus = document.getElementById('listStatus');

  const readResponse = async (response, fallback) => {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || fallback);
      error.status = response.status;
      throw error;
    }
    return result;
  };

  const setStatus = (element, message, type = '') => {
    element.textContent = message;
    element.className = `material-status${type ? ` ${type}` : ''}`;
  };

  const humanFileSize = (size) => {
    if (!Number.isFinite(Number(size))) return '';
    return Number(size) >= 1024 * 1024
      ? `${(Number(size) / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(Number(size) / 1024))} KB`;
  };

  const renderMaterials = (materials) => {
    if (!materials.length) {
      materialList.innerHTML = '<p class="material-empty">No hay documentos para este filtro.</p>';
      return;
    }

    materialList.innerHTML = materials.map((material) => {
      const yearLabel = material.school_year === 'todos'
        ? 'Todos los años'
        : `${material.school_year}° Año`;
      const subject = material.subject
        ? `<p>Materia: ${window.escapeHTML(material.subject)}</p>`
        : '';
      const status = material.status === 'pending'
        ? '<p>Estado: carga pendiente</p>'
        : `<p>${window.escapeHTML(material.category)} · ${window.escapeHTML(yearLabel)}${material.file_size ? ` · ${humanFileSize(material.file_size)}` : ''}</p>`;
      const fileActions = material.status === 'pending'
        ? ''
        : `<a class="action-button" href="${window.escapeHTML(material.view_url)}" target="_blank" rel="noopener noreferrer">Ver</a>
           <a class="action-button" href="${window.escapeHTML(material.download_url)}" target="_blank" rel="noopener noreferrer">Descargar</a>`;
      return `
        <article class="material-item">
          <div>
            <h3>${window.escapeHTML(material.title)}</h3>
            ${status}
            ${subject}
            <p>Archivo: ${window.escapeHTML(material.file_name)}</p>
          </div>
          <div class="material-item-actions">
            ${fileActions}
            <button class="action-button delete-button" type="button" data-delete-id="${window.escapeHTML(material.id)}">Eliminar</button>
          </div>
        </article>`;
    }).join('');
  };

  const loadMaterials = async () => {
    materialList.innerHTML = '<p class="material-empty">Cargando documentos...</p>';
    setStatus(listStatus, '');
    const year = encodeURIComponent(materialFilter.value);
    const response = await window.apiFetch(`${API_MATERIALS}?year=${year}`, { cache: 'no-store' });
    const result = await readResponse(response, 'No se pudieron cargar los documentos.');
    renderMaterials(Array.isArray(result.materials) ? result.materials : []);
  };

  const disableForm = () => {
    form.querySelectorAll('input, select, button').forEach((control) => {
      control.disabled = true;
    });
  };

  const updateSelectedFile = () => {
    const file = fileInput.files?.[0];
    fileName.innerHTML = file
      ? `${window.escapeHTML(file.name)}<br><span class="material-file-note">${humanFileSize(file.size)}</span>`
      : 'Selecciona un archivo o arrástralo aquí<br><span class="material-file-note">PDF, Word, Excel, PowerPoint, imágenes o texto · máximo 25 MB</span>';
  };

  fileInput.addEventListener('change', updateSelectedFile);
  ['dragenter', 'dragover'].forEach((eventName) => {
    fileDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      fileDrop.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach((eventName) => {
    fileDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      fileDrop.classList.remove('dragging');
    });
  });
  fileDrop.addEventListener('drop', (event) => {
    if (event.dataTransfer?.files?.length) {
      fileInput.files = event.dataTransfer.files;
      updateSelectedFile();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) {
      setStatus(uploadStatus, 'Selecciona un archivo para continuar.', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setStatus(uploadStatus, 'El archivo debe pesar menos de 25 MB.', 'error');
      return;
    }

    uploadButton.disabled = true;
    setStatus(uploadStatus, 'Preparando la carga...');
    let materialId = '';
    try {
      const prepareResponse = await window.apiFetch(`${API_MATERIALS}?action=prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleInput.value,
          category: categorySelect.value,
          schoolYear: yearSelect.value,
          subject: subjectInput.value,
          fileName: file.name,
          fileSize: file.size,
        }),
      });
      const prepared = await readResponse(prepareResponse, 'No se pudo preparar la carga.');
      materialId = prepared.id;

      setStatus(uploadStatus, 'Subiendo el archivo...');
      const storageResponse = await fetch(prepared.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': prepared.mime_type },
        body: file,
      });
      if (!storageResponse.ok) {
        const storageError = await storageResponse.json().catch(() => ({}));
        throw new Error(storageError.message || storageError.error || 'Supabase Storage rechazó el archivo.');
      }

      const completeResponse = await window.apiFetch(`${API_MATERIALS}?action=complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: materialId }),
      });
      await readResponse(completeResponse, 'El archivo subió, pero no se pudo finalizar su registro.');
      form.reset();
      updateSelectedFile();
      setStatus(uploadStatus, 'Material subido correctamente.', 'success');
      await loadMaterials();
    } catch (error) {
      if (materialId) {
        try {
          const cleanupResponse = await window.apiFetch(API_MATERIALS, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: materialId }),
          });
          await readResponse(cleanupResponse, 'No se pudo limpiar la carga incompleta.');
        } catch (cleanupError) {
          console.error('No se pudo limpiar la carga incompleta:', cleanupError);
        }
      }
      console.error('No se pudo subir el material académico:', error);
      setStatus(uploadStatus, error.message || 'No se pudo subir el material.', 'error');
    } finally {
      uploadButton.disabled = false;
    }
  });

  materialFilter.addEventListener('change', () => {
    loadMaterials().catch((error) => {
      console.error('No se pudieron cargar los materiales académicos:', error);
      materialList.innerHTML = '<p class="material-empty">No se pudo cargar la lista.</p>';
      setStatus(listStatus, error.message || 'No se pudieron cargar los documentos.', 'error');
      if (error.status === 401 || error.status === 403) disableForm();
    });
  });

  materialList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-id]');
    if (!button) return;
    const id = button.dataset.deleteId;
    if (!window.confirm('¿Eliminar este material académico?')) return;

    button.disabled = true;
    try {
      const response = await window.apiFetch(API_MATERIALS, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await readResponse(response, 'No se pudo eliminar el material.');
      setStatus(listStatus, 'Material eliminado.', 'success');
      await loadMaterials();
    } catch (error) {
      console.error('No se pudo eliminar el material académico:', error);
      setStatus(listStatus, error.message || 'No se pudo eliminar el material.', 'error');
      button.disabled = false;
    }
  });

  loadMaterials().catch((error) => {
    console.error('No se pudieron cargar los materiales académicos:', error);
    materialList.innerHTML = '<p class="material-empty">No se pudo cargar la lista.</p>';
    setStatus(listStatus, error.message || 'No se pudieron cargar los documentos.', 'error');
    if (error.status === 401 || error.status === 403) disableForm();
  });
})();
