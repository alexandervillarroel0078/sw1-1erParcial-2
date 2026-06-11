const { Server } = require('@hocuspocus/server');
const Y = require('yjs');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const YJS_PREFIX = 'YJS:';

function parseName(documentName) {
  const parts = documentName.split('-nodo-');
  return { tramiteId: parts[0], nodoId: parts[1] };
}

async function cargarContenido(tramiteId, nodoId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/doc-colaborativo/${tramiteId}/${nodoId}`);
    const doc = await res.json();
    console.log('[HOCUSPOCUS] doc obtenido:', doc ? 'SÍ' : 'NO', 'plantillaContenido:', doc?.plantillaContenido?.substring(0, 100));
    return doc.plantillaContenido || '';
  } catch {
    return '';
  }
}

async function guardarContenido(tramiteId, nodoId, contenido) {
  try {
    await fetch(`${BACKEND_URL}/api/doc-colaborativo/${tramiteId}/${nodoId}/contenido`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido }),
    });
  } catch {
    // ignorar errores de red
  }
}

function contenidoToYdoc(contenido) {
  console.log(
    '[HOCUSPOCUS] contenido recibido:',
    contenido?.substring(0, 100),
    'empieza con YJS:',
    contenido?.startsWith('YJS:'),
  );
  if (!contenido || contenido.startsWith('DOCX_B64:')) {
    return null;
  }
  if (contenido.startsWith(YJS_PREFIX)) {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, Buffer.from(contenido.slice(YJS_PREFIX.length), 'base64'));
    return ydoc;
  }
  // Texto plano → convertir a Y.Doc
  if (contenido && typeof contenido === 'string' && contenido.trim().length > 0) {
    const ydoc = new Y.Doc();
    const fragment = ydoc.getXmlFragment('default');

    const lineas = contenido.split('\n');
    for (const linea of lineas) {
      const paragraph = new Y.XmlElement('paragraph');
      if (linea.trim().length > 0) {
        const text = new Y.XmlText();
        text.insert(0, linea);
        paragraph.insert(0, [text]);
      }
      fragment.push([paragraph]);
    }

    console.log('[HOCUSPOCUS] texto plano convertido a XmlFragment con', lineas.length, 'párrafos');
    return ydoc;
  }

  return null;
}

const server = new Server({
  port: 1234,
  async onLoadDocument({ documentName }) {
    console.log('[HOCUSPOCUS] onLoadDocument llamado, documentName:', documentName);
    const { tramiteId, nodoId } = parseName(documentName);
    if (!tramiteId || !nodoId) {
      return null;
    }
    const contenido = await cargarContenido(tramiteId, nodoId);
    const ydoc = contenidoToYdoc(contenido);
    console.log('[HOCUSPOCUS] retornando ydoc:', ydoc ? 'poblado' : 'null');
    return ydoc;
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
