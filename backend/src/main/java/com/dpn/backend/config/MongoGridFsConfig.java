package com.dpn.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;

/**
 * Bucket GridFS por defecto ({@code fs}) sobre la misma base MongoDB de la app.
 */
@Configuration
public class MongoGridFsConfig {

	@Bean
	public GridFsTemplate gridFsTemplate(
			MongoDatabaseFactory mongoDatabaseFactory,
			MongoConverter mongoConverter) {
		return new GridFsTemplate(mongoDatabaseFactory, mongoConverter);
	}
}
