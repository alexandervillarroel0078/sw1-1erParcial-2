package com.dpn.backend.service;

import com.dpn.backend.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class ArchivoService {

	private final GridFsTemplate gridFsTemplate;

	/** Guarda el binario en GridFS y devuelve el {@link ObjectId} en hex. */
	public String guardar(MultipartFile file) throws IOException {
		if (file.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Archivo vacío");
		}
		String nombre = StringUtils.hasText(file.getOriginalFilename())
				? file.getOriginalFilename()
				: "archivo";
		Document meta = new Document();
		if (StringUtils.hasText(file.getContentType())) {
			meta.put("_contentType", file.getContentType());
		}
		meta.put("tamanoBytes", file.getSize());
		ObjectId id = gridFsTemplate.store(file.getInputStream(), nombre, meta);
		return id.toHexString();
	}

	public GridFsResource obtener(String id) {
		ObjectId oid = parseObjectId(id);
		com.mongodb.client.gridfs.model.GridFSFile gfs =
				gridFsTemplate.findOne(Query.query(Criteria.where("_id").is(oid)));
		if (gfs == null) {
			throw new ApiException(HttpStatus.NOT_FOUND, "Archivo no encontrado");
		}
		return gridFsTemplate.getResource(gfs);
	}

	public void eliminar(String id) {
		ObjectId oid = parseObjectId(id);
		gridFsTemplate.delete(Query.query(Criteria.where("_id").is(oid)));
	}

	private static ObjectId parseObjectId(String id) {
		try {
			return new ObjectId(id);
		} catch (IllegalArgumentException e) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Id de archivo inválido");
		}
	}
}
