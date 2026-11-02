package com.avalliar.api.usuario;

import com.avalliar.api.common.exception.ResourceNotFoundException;
import com.avalliar.api.usuario.dto.UsuarioRequest;
import com.avalliar.api.usuario.dto.UsuarioResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UsuarioResponse> listar() {
        return usuarioRepository.findAll()
                .stream()
                .map(UsuarioResponse::fromEntity)
                .toList();
    }

    public UsuarioResponse buscarPorId(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
        return UsuarioResponse.fromEntity(usuario);
    }

    public UsuarioResponse criar(UsuarioRequest request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("E-mail já cadastrado");
        }

        String senhaPlana = (request.senha() != null && !request.senha().isBlank())
                ? request.senha()
                : "avalliar123";

        Role role = request.role() != null ? request.role() : Role.OPERACIONAL;

        Usuario usuario = Usuario.builder()
                .nome(request.nome())
                .email(request.email())
                .senha(passwordEncoder.encode(senhaPlana))
                .role(role)
                .cargo(request.cargo())
                .telefone(request.telefone())
                .build();

        return UsuarioResponse.fromEntity(usuarioRepository.save(usuario));
    }

    public UsuarioResponse atualizar(Long id, UsuarioRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        usuario.setNome(request.nome());
        usuario.setEmail(request.email());
        if (request.role() != null) {
            usuario.setRole(request.role());
        }
        if (request.cargo() != null) {
            usuario.setCargo(request.cargo());
        }
        if (request.telefone() != null) {
            usuario.setTelefone(request.telefone());
        }
        if (request.senha() != null && !request.senha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.senha()));
        }

        return UsuarioResponse.fromEntity(usuarioRepository.save(usuario));
    }

    public void excluir(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
        usuarioRepository.delete(usuario);
    }
}
