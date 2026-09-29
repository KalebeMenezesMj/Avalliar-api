package com.avalliar.api.auth.dto;

public record AuthResponse(
        String token,
        String email,
        String nome,
        String role
) {
}
