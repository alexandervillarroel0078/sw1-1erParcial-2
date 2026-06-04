export interface DocumentoColaborativo {
  id?: string;
  tramiteId: string;
  nodoId: string;
  titulo: string;
  plantillaContenido?: string;
  contenidoTexto?: string;
  documentKey: string;
  creadoEn?: string;
}

export interface CrearDocumentoColaborativoRequest {
  titulo: string;
  plantillaContenido: string;
}

export const DOCX_CONTENT_PREFIX = 'DOCX_B64:';

export function docColaborativoFileType(plantillaContenido?: string | null): 'docx' | 'txt' {
  return plantillaContenido?.startsWith(DOCX_CONTENT_PREFIX) ? 'docx' : 'txt';
}
