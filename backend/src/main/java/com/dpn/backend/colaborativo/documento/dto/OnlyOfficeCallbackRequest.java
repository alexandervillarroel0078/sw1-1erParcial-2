package com.dpn.backend.colaborativo.documento.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OnlyOfficeCallbackRequest {

	private Integer status;
	private String url;
	private String key;
}
