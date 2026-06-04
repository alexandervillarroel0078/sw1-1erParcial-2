package com.dpn.backend.informe.service;

import com.dpn.backend.colaborativo.documento.model.DocumentoColaborativo;
import com.dpn.backend.colaborativo.documento.repository.DocumentoColaborativoRepository;
import com.dpn.backend.documento.service.DocumentoService;
import com.dpn.backend.formulario.model.FormularioActividad;
import com.dpn.backend.formulario.repository.FormularioActividadRepository;
import com.dpn.backend.informe.dto.InformeCreateDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.informe.model.Informe;
import com.dpn.backend.archivo.model.embedded.ArchivoAdjunto;
import com.dpn.backend.informe.repository.InformeRepository;
import com.dpn.backend.tarea.model.Tarea;
import com.dpn.backend.tarea.repository.TareaRepository;
import com.dpn.backend.tramite.model.Tramite;
import com.dpn.backend.tramite.repository.TramiteRepository;
import com.dpn.backend.usuario.model.Usuario;
import com.dpn.backend.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InformeService {

	private static final float MARGIN_LEFT = 50f;
	private static final float MARGIN_TOP = 750f;
	private static final float LINE_HEIGHT = 16f;
	private static final String DOCX_PREFIX = "DOCX_B64:";
	private static final String YJS_PREFIX = "YJS:";
	private static final String PREFIJO_TITULO_DOC_COLAB = "Título: ";
	private static final String MSG_VER_DOC_COLAB_SISTEMA = "Ver documento colaborativo en el sistema";
	private static final DateTimeFormatter FECHA_FORMAT =
			DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());

	private final InformeRepository informeRepository;
	private final DocumentoService documentoService;
	private final UsuarioRepository usuarioRepository;
	private final FormularioActividadRepository formularioActividadRepository;
	private final DocumentoColaborativoRepository documentoColaborativoRepository;
	private final TareaRepository tareaRepository;
	private final TramiteRepository tramiteRepository;

	public Informe crear(InformeCreateDTO dto, String funcionarioId, String usuarioNombre) {
		Instant now = Instant.now();
		List<ArchivoAdjunto> archivosNorm = normalizarArchivos(dto.getArchivos(), now);
		Informe i = Informe.builder()
				.id(UUID.randomUUID().toString())
				.tramiteId(dto.getTramiteId())
				.tareaId(dto.isEsBorrador() ? null : dto.getTareaId())
				.funcionarioId(funcionarioId)
				.nodoActividadId(dto.getNodoActividadId())
				.descripcion(dto.getDescripcion())
				.resultado(dto.getResultado())
				.observaciones(dto.getObservaciones())
				.archivos(archivosNorm)
				.esBorrador(dto.isEsBorrador())
				.creadoEn(now)
				.enviadoEn(dto.isEsBorrador() ? null : now)
				.build();
		Informe guardado = informeRepository.save(i);
		if (!guardado.isEsBorrador()) {
			subirPdfInformeSilencioso(guardado, usuarioNombre);
		}
		return guardado;
	}

	private void subirPdfInformeSilencioso(Informe informe, String usuarioNombre) {
		try {
			byte[] pdf = generarPdfInforme(informe);
			long timestamp = informe.getEnviadoEn() != null
					? informe.getEnviadoEn().toEpochMilli()
					: System.currentTimeMillis();
			String nombreArchivo = "informe-" + informe.getNodoActividadId() + "-" + timestamp + ".pdf";
			MultipartFile file = new ByteArrayMultipartFile(
					pdf,
					nombreArchivo,
					"application/pdf");
			documentoService.subir(
					file,
					informe.getTramiteId(),
					informe.getNodoActividadId(),
					informe.getFuncionarioId(),
					usuarioNombre);
			subirPdfDocColaborativoSilencioso(informe, usuarioNombre, timestamp);
		} catch (Exception e) {
			log.warn("No se pudo generar o subir el PDF del informe {}: {}", informe.getId(), e.getMessage());
		}
	}

	private void subirPdfDocColaborativoSilencioso(Informe informe, String usuarioNombre, long timestamp) {
		try {
			Optional<Tarea> tareaOpt = informe.getTareaId() != null && !informe.getTareaId().isBlank()
					? tareaRepository.findById(informe.getTareaId())
					: Optional.empty();
			String politicaId = tareaOpt.map(Tarea::getPoliticaId).filter(id -> !id.isBlank()).orElse(null);
			if (politicaId == null) {
				politicaId = tramiteRepository.findById(informe.getTramiteId())
						.map(Tramite::getPoliticaId)
						.filter(id -> id != null && !id.isBlank())
						.orElse(null);
			}
			if (politicaId == null) {
				return;
			}

			String nodoFormId = tareaOpt.map(Tarea::getForkNodoId)
					.filter(id -> id != null && !id.isBlank())
					.orElse(informe.getNodoActividadId());
			if (nodoFormId == null || nodoFormId.isBlank()) {
				nodoFormId = tareaOpt.map(Tarea::getNodoFlujoId).orElse(null);
			}
			if (nodoFormId == null || nodoFormId.isBlank()) {
				return;
			}

			Optional<FormularioActividad> formOpt =
					formularioActividadRepository.findByPoliticaIdAndNodoActividadId(politicaId, nodoFormId);
			if (formOpt.isEmpty() || !formOpt.get().isHabilitadoDocumentoColaborativo()) {
				return;
			}

			String nodoDocClave = nodoFormId;
			Optional<DocumentoColaborativo> docColabOpt = documentoColaborativoRepository
					.findByTramiteIdAndNodoId(informe.getTramiteId(), nodoDocClave);
			if (docColabOpt.isEmpty()) {
				return;
			}

			DocumentoColaborativo docColab = docColabOpt.get();
			String texto = extraerTextoDocumentoColaborativo(docColab);
			if (texto.isBlank()) {
				return;
			}

			byte[] pdf = generarPdfDocumentoColaborativo(
					normalizarTituloDocumentoColaborativo(docColab.getTitulo()),
					nodoDocClave,
					texto);
			String nombreArchivo = "doc-colaborativo-" + nodoDocClave + "-" + timestamp + ".pdf";
			MultipartFile file = new ByteArrayMultipartFile(pdf, nombreArchivo, "application/pdf");
			documentoService.subir(
					file,
					informe.getTramiteId(),
					informe.getNodoActividadId(),
					informe.getFuncionarioId(),
					usuarioNombre);
		} catch (Exception e) {
			log.warn(
					"No se pudo generar o subir el PDF del documento colaborativo para informe {}: {}",
					informe.getId(),
					e.getMessage());
		}
	}

	private byte[] generarPdfInforme(Informe informe) throws IOException {
		List<String> lineas = new ArrayList<>();
		lineas.add("Informe de actividad");
		lineas.add("");
		lineas.add("Nodo: " + nullSafe(informe.getNodoActividadId()));
		lineas.add("Funcionario: " + nombreFuncionario(informe.getFuncionarioId()));
		lineas.add("Fecha: " + (informe.getEnviadoEn() != null
				? FECHA_FORMAT.format(informe.getEnviadoEn())
				: "-"));
		lineas.add("");
		lineas.add("Descripción:");
		agregarTextoMultilinea(lineas, informe.getDescripcion());
		if (informe.getObservaciones() != null && !informe.getObservaciones().isBlank()) {
			lineas.add("");
			lineas.add("Observaciones:");
			agregarTextoMultilinea(lineas, informe.getObservaciones());
		}
		lineas.add("");
		lineas.add("Resultado:");
		agregarTextoMultilinea(lineas, informe.getResultado());

		return generarPdfDesdeLineas(lineas, "Informe de actividad");
	}

	private byte[] generarPdfDocumentoColaborativo(String titulo, String nodoId, String texto) throws IOException {
		List<String> lineas = new ArrayList<>();
		lineas.add("Documento colaborativo");
		lineas.add("");
		lineas.add("Título: " + nullSafe(titulo));
		lineas.add("Nodo: " + nullSafe(nodoId));
		lineas.add("");
		lineas.add("Contenido:");
		agregarTextoMultilinea(lineas, texto);
		return generarPdfDesdeLineas(lineas, "Documento colaborativo");
	}

	private byte[] generarPdfDesdeLineas(List<String> lineas, String tituloPrincipal) throws IOException {
		try (PDDocument document = new PDDocument()) {
			PDPage page = new PDPage();
			document.addPage(page);
			PDType1Font fontTitulo = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
			PDType1Font fontCuerpo = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
			try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
				float y = MARGIN_TOP;
				for (String linea : lineas) {
					if (y < 50f) {
						break;
					}
					boolean esTitulo = tituloPrincipal.equals(linea);
					cs.beginText();
					cs.setFont(esTitulo ? fontTitulo : fontCuerpo, esTitulo ? 16f : 12f);
					cs.newLineAtOffset(MARGIN_LEFT, y);
					cs.showText(sanitizePdfText(linea));
					cs.endText();
					y -= esTitulo ? 24f : LINE_HEIGHT;
				}
			}
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			document.save(out);
			return out.toByteArray();
		}
	}

	private String nombreFuncionario(String funcionarioId) {
		if (funcionarioId == null || funcionarioId.isBlank()) {
			return "-";
		}
		return usuarioRepository.findById(funcionarioId)
				.map(Usuario::getNombre)
				.filter(n -> n != null && !n.isBlank())
				.orElse(funcionarioId);
	}

	private String extraerTextoDocumentoColaborativo(DocumentoColaborativo doc) {
		String contenido = doc.getPlantillaContenido();
		if (contenido == null || contenido.isBlank()) {
			return "";
		}
		if (contenido.startsWith(YJS_PREFIX)) {
			return MSG_VER_DOC_COLAB_SISTEMA;
		}
		if (contenido.startsWith(DOCX_PREFIX)) {
			return extraerTextoDesdeDocxBase64(contenido.substring(DOCX_PREFIX.length()));
		}
		return contenido;
	}

	private static String normalizarTituloDocumentoColaborativo(String titulo) {
		if (titulo == null || titulo.isBlank()) {
			return "";
		}
		String t = titulo.trim();
		if (t.startsWith(PREFIJO_TITULO_DOC_COLAB)) {
			return t.substring(PREFIJO_TITULO_DOC_COLAB.length()).trim();
		}
		return t;
	}

	private String extraerTextoDesdeDocxBase64(String base64) {
		try {
			byte[] bytes = Base64.getDecoder().decode(base64);
			try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
				StringBuilder sb = new StringBuilder();
				for (XWPFParagraph paragraph : document.getParagraphs()) {
					String text = paragraph.getText();
					if (text != null && !text.isBlank()) {
						if (!sb.isEmpty()) {
							sb.append('\n');
						}
						sb.append(text.trim());
					}
				}
				return sb.toString();
			}
		} catch (Exception e) {
			log.warn("No se pudo extraer texto DOCX del documento colaborativo: {}", e.getMessage());
			return "";
		}
	}

	private static void agregarTextoMultilinea(List<String> lineas, String texto) {
		if (texto == null || texto.isBlank()) {
			lineas.add("-");
			return;
		}
		for (String parrafo : texto.split("\\R")) {
			lineas.add(parrafo.isBlank() ? " " : parrafo);
		}
	}

	private static String nullSafe(String value) {
		return value != null ? value : "-";
	}

	private static String sanitizePdfText(String text) {
		if (text == null || text.isEmpty()) {
			return " ";
		}
		return text.replace('\t', ' ');
	}

	private static List<ArchivoAdjunto> normalizarArchivos(List<ArchivoAdjunto> in, Instant ahora) {
		if (in == null || in.isEmpty()) {
			return List.of();
		}
		List<ArchivoAdjunto> out = new ArrayList<>(in.size());
		for (ArchivoAdjunto a : in) {
			if (a.getId() == null || a.getId().isBlank()) {
				continue;
			}
			out.add(ArchivoAdjunto.builder()
					.id(a.getId())
					.nombre(a.getNombre())
					.url(a.getUrl())
					.tipo(a.getTipo())
					.tamanoBytes(a.getTamanoBytes())
					.subidoEn(a.getSubidoEn() != null ? a.getSubidoEn() : ahora)
					.build());
		}
		return out;
	}

	public List<Informe> listarPorTramite(String tramiteId) {
		return informeRepository.findByTramiteIdOrderByCreadoEnDesc(tramiteId);
	}

	/**
	 * Informe asociado a la tarea; solo el funcionario autor del informe puede verlo.
	 */
	public Informe obtenerPorTareaId(String tareaId, String funcionarioId) {
		Informe i = informeRepository.findByTareaId(tareaId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Informe no encontrado"));
		if (i.getFuncionarioId() == null || !i.getFuncionarioId().equals(funcionarioId)) {
			throw new ApiException(HttpStatus.NOT_FOUND, "Informe no encontrado");
		}
		return i;
	}

	public Optional<Informe> obtenerBorrador(String tramiteId, String nodoId, String funcionarioId) {
		return informeRepository.findByTramiteIdAndNodoActividadIdAndFuncionarioIdAndEsBorrador(
				tramiteId, nodoId, funcionarioId, true);
	}

	public Informe actualizarBorrador(String id, InformeCreateDTO dto, String funcionarioId) {
		Informe i = informeRepository.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Informe no encontrado"));
		if (i.getFuncionarioId() == null || !i.getFuncionarioId().equals(funcionarioId)) {
			throw new ApiException(HttpStatus.NOT_FOUND, "Informe no encontrado");
		}
		if (!i.isEsBorrador()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Solo se pueden actualizar borradores");
		}
		i.setDescripcion(dto.getDescripcion());
		i.setObservaciones(dto.getObservaciones());
		i.setResultado(dto.getResultado());
		return informeRepository.save(i);
	}

	private static final class ByteArrayMultipartFile implements MultipartFile {

		private final byte[] content;
		private final String originalFilename;
		private final String contentType;

		private ByteArrayMultipartFile(byte[] content, String originalFilename, String contentType) {
			this.content = content;
			this.originalFilename = originalFilename;
			this.contentType = contentType;
		}

		@Override
		public String getName() {
			return originalFilename;
		}

		@Override
		public String getOriginalFilename() {
			return originalFilename;
		}

		@Override
		public String getContentType() {
			return contentType;
		}

		@Override
		public boolean isEmpty() {
			return content.length == 0;
		}

		@Override
		public long getSize() {
			return content.length;
		}

		@Override
		public byte[] getBytes() {
			return content;
		}

		@Override
		public InputStream getInputStream() {
			return new ByteArrayInputStream(content);
		}

		@Override
		public void transferTo(java.io.File dest) throws IOException {
			java.nio.file.Files.write(dest.toPath(), content);
		}
	}
}
