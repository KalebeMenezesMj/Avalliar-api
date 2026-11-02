package com.avalliar.api.usuario.dto;

import com.avalliar.api.usuario.Role;
import com.avalliar.api.usuario.Usuario;

public record UsuarioResponse(
        Long id,
        String nome,
        String email,
        Role role,
        String cargo,
        String telefone
) {
    public static UsuarioResponse fromEntity(Usuario u) {
        return new UsuarioResponse(
                u.getId(),
                u.getNome(),
                u.getEmail(),
                u.getRole(),
                u.getCargo(),
                u.getTelefone()
        );
    }
}
