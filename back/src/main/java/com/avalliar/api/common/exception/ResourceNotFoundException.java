package com.avalliar.api.common.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String recurso, Object id) {
        super(recurso + " não encontrado com id " + id);
    }
}
