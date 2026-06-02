package com.dpn.backend.informe.service;

import com.dpn.backend.documento.service.DocumentoService;
import com.dpn.backend.informe.dto.InformeCreateDTO;
import com.dpn.backend.exception.ApiException;
import com.dpn.backend.informe.model.Informe;
import com.dpn.backend.archivo.model.embedded.ArchivoAdjunto;
import com.dpn.backend.informe.repository.InformeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
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
	private static final DateTimeFormatter FECHA_FORMAT =
			DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());

	private final InformeRepository informeRepository;
	private final DocumentoService documentoService;

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
		} catch (Exception e) {
			log.warn("No se pudo generar o subir el PDF del informe {}: {}", informe.getId(), e.getMessage());
		}
	}

	private byte[] generarPdfInforme(Informe informe) throws IOException {
		List<String> lineas = new ArrayList<>();
		lineas.add("Informe de actividad");
		lineas.add("");
		lineas.add("Nodo: " + nullSafe(informe.getNodoActividadId()));
		lineas.add("Funcionario: " + nullSafe(informe.getFuncionarioId()));
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
					boolean esTitulo = "Informe de actividad".equals(linea);
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
