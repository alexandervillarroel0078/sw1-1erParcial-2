const { Server } = require('@hocuspocus/server');
const http = require('http');
const Y = require('yjs');

const BACKEND_URL = 'http://localhost:8080';
const YJS_PREFIX = 'YJS:';

function parseName(documentName) {
  const parts = documentName.split('-nodo-');
  return { tramiteId: parts[0], nodoId: parts[1] };
}

function cargarContenido(tramiteId, nodoId) {
  return new Promise((resolve) => {
    http
      .get(`${BACKEND_URL}/api/doc-colaborativo/${tramiteId}/${nodoId}`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const doc = JSON.parse(data);
            resolve(doc.plantillaContenido || '');
          } catch {
            resolve('');
          }
        });
      })
      .on('error', () => resolve(''));
  });
}

function guardarContenido(tramiteId, nodoId, contenido) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ contenido });
    const req = http.request(
      `${BACKEND_URL}/api/doc-colaborativo/${tramiteId}/${nodoId}/contenido`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      () => resolve(),
    );
    req.on('error', () => resolve());
    req.write(body);
    req.end();
  });
}

function contenidoToYdoc(contenido) {
  if (!contenido || contenido.startsWith('DOCX_B64:')) {
    return null;
  }
  if (contenido.startsWith(YJS_PREFIX)) {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, Buffer.from(contenido.slice(YJS_PREFIX.length), 'base64'));
    return ydoc;
  }
  return null;
}

const server = new Server({
  port: 1234,
  async onLoadDocument({ documentName }) {
    const { tramiteId, nodoId } = parseName(documentName);
    if (!tramiteId || !nodoId) {
      return null;
    }
    const contenido = await cargarContenido(tramiteId, nodoId);
    return contenidoToYdoc(contenido);
  },
  async onStoreDocument({ documentName, document }) {
    const { tramiteId, nodoId } = parseName(documentName);
    if (!tramiteId || !nodoId) {
      return;
    }
    const state = Y.encodeStateAsUpdate(document);
    const contenido = YJS_PREFIX + Buffer.from(state).toString('base64');
    await guardarContenido(tramiteId, nodoId, contenido);
  },
});

server.listen();
