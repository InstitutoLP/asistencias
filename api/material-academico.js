const { randomUUID } = require('crypto');
const { authenticateRequest } = require('../auth-service');

const SUPABASE_URL = (process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET = 'material-academico';
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const CATEGORIES = ['Plan de Evaluación', 'Material de Apoyo', 'Guía de Estudio', 'Otro'];
const YEARS = ['1', '2', '3', '4', '5', 'todos'];
const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
};

const normalizePersonName = (name) => String(name || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const canManageMaterials = (profile) => {
  const name = normalizePersonName(`${profile?.display_name || ''} ${profile?.login_username || ''}`);
  return (name.includes('nestor') && name.includes('perez'))
    || (name.includes('andy') && name.includes('suarez'));
};

const parseBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('La solicitud es demasiado grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
};

const readResponse = async (response, fallback) => {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.message || data.error || fallback);
  }
  return data;
};

const supabaseRequest = (path, options = {}) => fetch(`${SUPABASE_URL}/rest/v1${path}`, {
  ...options,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  },
});

const storageRequest = (path, options = {}) => fetch(`${SUPABASE_URL}/storage/v1${path}`, {
  ...options,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  },
});

const encodeStoragePath = (storagePath) => storagePath
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/');

const absoluteStorageUrl = (value) => {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/storage/v1/')) return `${SUPABASE_URL}${value}`;
  return `${SUPABASE_URL}/storage/v1${value.startsWith('/') ? value : `/${value}`}`;
};

const createSignedUrl = async (storagePath, downloadName) => {
  const response = await storageRequest(
    `/object/sign/${BUCKET}/${encodeStoragePath(storagePath)}`,
    { method: 'POST', body: JSON.stringify({ expiresIn: 3600 }) },
  );
  const data = await readResponse(response, 'No se pudo preparar el enlace del archivo.');
  if (typeof data.signedURL !== 'string' && typeof data.signedUrl !== 'string') {
    throw new Error('Supabase no devolvió un enlace válido para el archivo.');
  }
  const viewUrl = absoluteStorageUrl(data.signedURL || data.signedUrl);
  const downloadUrl = new URL(viewUrl);
  downloadUrl.searchParams.set('download', downloadName);
  return { viewUrl, downloadUrl: downloadUrl.toString() };
};

const authorizeManager = async (req, res) => {
  let auth;
  try {
    auth = await authenticateRequest(req);
  } catch (error) {
    console.error('Academic material session validation error:', error);
    res.status(500).json({ error: 'No se pudo validar la sesión.' });
    return null;
  }
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return null;
  }
  if (!canManageMaterials(auth.profile)) {
    res.status(403).json({ error: 'No tienes permiso para gestionar material académico.' });
    return null;
  }
  return auth.profile;
};

const listMaterials = async (req, res, isManager) => {
  const year = String(req.query?.year || '');
  if (isManager) {
    if (year !== 'all' && !YEARS.includes(year)) {
      return res.status(400).json({ error: 'Selecciona un año escolar válido.' });
    }
  } else if (year === 'all') {
    return res.status(403).json({ error: 'Solo Néstor Pérez y Andy Suárez pueden gestionar materiales.' });
  } else if (!['1', '2', '3', '4', '5'].includes(year)) {
    return res.status(400).json({ error: 'El año escolar no es válido.' });
  }

  const filters = [
    'select=id,title,category,school_year,subject,file_name,mime_type,file_size,created_at,status,storage_path',
    'order=created_at.desc',
    'limit=250',
  ];
  if (!isManager) {
    filters.push('status=eq.ready');
  }
  if (year !== 'all') {
    filters.push(year === 'todos'
      ? 'school_year=eq.todos'
      : `or=(school_year.eq.${year},school_year.eq.todos)`);
  }

  const response = await supabaseRequest(`/academic_materials?${filters.join('&')}`);
  const rows = await readResponse(response, 'No se pudieron consultar los materiales.');
  if (!Array.isArray(rows)) throw new Error('Supabase devolvió una lista de materiales inválida.');
  const materials = await Promise.all(rows.map(async (row) => {
    if (row.status !== 'ready') {
      return { ...row, view_url: '', download_url: '' };
    }
    const urls = await createSignedUrl(row.storage_path, row.file_name);
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      school_year: row.school_year,
      subject: row.subject,
      file_name: row.file_name,
      mime_type: row.mime_type,
      file_size: row.file_size,
      created_at: row.created_at,
      ...(isManager ? { status: row.status } : {}),
      view_url: urls.viewUrl,
      download_url: urls.downloadUrl,
    };
  }));
  return res.status(200).json({ materials });
};

const prepareUpload = async (body, profile, res) => {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = typeof body.category === 'string' ? body.category : '';
  const schoolYear = typeof body.schoolYear === 'string' ? body.schoolYear : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const rawFileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const extension = rawFileName.slice(rawFileName.lastIndexOf('.')).toLowerCase();
  const mimeType = MIME_TYPES[extension];
  const fileSize = Number(body.fileSize);

  if (!title || title.length > 150) {
    return res.status(400).json({ error: 'Escribe un título de hasta 150 caracteres.' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Selecciona una categoría válida.' });
  }
  if (!YEARS.includes(schoolYear)) {
    return res.status(400).json({ error: 'Selecciona un año escolar válido.' });
  }
  if (subject.length > 120) {
    return res.status(400).json({ error: 'La materia no puede superar 120 caracteres.' });
  }
  if (!mimeType || rawFileName.length > 180) {
    return res.status(400).json({ error: 'El formato del archivo no está permitido.' });
  }
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'El archivo debe pesar menos de 25 MB.' });
  }

  const fileName = rawFileName.replace(/[<>:"|?*\u0000-\u001f/\\]/g, '_');
  const id = randomUUID();
  const storagePath = `${schoolYear}/${id}/${fileName}`;
  const uploadResponse = await storageRequest(
    `/object/upload/sign/${BUCKET}/${encodeStoragePath(storagePath)}`,
    { method: 'POST', body: JSON.stringify({ upsert: false }) },
  );
  const uploadData = await readResponse(uploadResponse, 'No se pudo preparar la carga en Supabase Storage.');
  const signedUpload = uploadData.signedURL || uploadData.signedUrl || uploadData.url;
  if (typeof signedUpload !== 'string') {
    throw new Error('Supabase no devolvió un enlace de carga válido.');
  }
  const uploadUrl = new URL(absoluteStorageUrl(signedUpload));
  if (uploadData.token) uploadUrl.searchParams.set('token', uploadData.token);

  const row = {
    id,
    title,
    category,
    school_year: schoolYear,
    subject,
    file_name: fileName,
    mime_type: mimeType,
    file_size: fileSize,
    storage_path: storagePath,
    uploaded_by: profile.display_name || profile.login_username,
    status: 'pending',
  };
  const insertResponse = await supabaseRequest('/academic_materials', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  await readResponse(insertResponse, 'No se pudo guardar el registro del material.');
  return res.status(201).json({ id, upload_url: uploadUrl.toString(), mime_type: mimeType });
};

const completeUpload = async (body, res) => {
  const id = typeof body.id === 'string' ? body.id : '';
  if (!/^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'El identificador del material no es válido.' });
  }
  const response = await supabaseRequest(`/academic_materials?id=eq.${id}&status=eq.pending`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'ready' }),
  });
  const rows = await readResponse(response, 'No se pudo finalizar el registro del material.');
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(404).json({ error: 'No se encontró una carga pendiente para finalizar.' });
  }
  return res.status(200).json({ ok: true });
};

const deleteMaterial = async (body, res) => {
  const id = typeof body.id === 'string' ? body.id : '';
  if (!/^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'El identificador del material no es válido.' });
  }
  const lookupResponse = await supabaseRequest(
    `/academic_materials?select=id,storage_path&id=eq.${id}`,
  );
  const rows = await readResponse(lookupResponse, 'No se pudo consultar el material.');
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(404).json({ error: 'No se encontró el material solicitado.' });
  }

  const storageResponse = await storageRequest(`/object/${BUCKET}`, {
    method: 'DELETE',
    body: JSON.stringify({ prefixes: [rows[0].storage_path] }),
  });
  await readResponse(storageResponse, 'No se pudo eliminar el archivo de Supabase Storage.');
  const deleteResponse = await supabaseRequest(`/academic_materials?id=eq.${id}`, {
    method: 'DELETE',
  });
  await readResponse(deleteResponse, 'No se pudo eliminar el registro del material.');
  return res.status(200).json({ ok: true });
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const hasAuthorization = Boolean(req.headers?.authorization);
  const isManagerRequest = req.method !== 'GET' || hasAuthorization;
  let profile = null;
  if (isManagerRequest) {
    profile = await authorizeManager(req, res);
    if (!profile) return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Falta configurar Supabase en el servidor.' });
  }

  try {
    if (req.method === 'GET') {
      return await listMaterials(req, res, isManagerRequest);
    }
    const body = await parseBody(req);
    if (req.method === 'POST' && req.query?.action === 'prepare') {
      return await prepareUpload(body, profile, res);
    }
    if (req.method === 'POST' && req.query?.action === 'complete') {
      return await completeUpload(body, res);
    }
    if (req.method === 'DELETE') {
      return await deleteMaterial(body, res);
    }
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (error) {
    console.error('Academic material API error:', error);
    return res.status(500).json({ error: error.message || 'No se pudo completar la operación.' });
  }
};
