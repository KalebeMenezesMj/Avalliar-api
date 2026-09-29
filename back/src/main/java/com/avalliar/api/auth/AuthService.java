package com.avalliar.api.auth;

import com.avalliar.api.auth.dto.AuthResponse;
import com.avalliar.api.auth.dto.LoginRequest;
import com.avalliar.api.auth.dto.RegisterRequest;
import com.avalliar.api.security.JwtService;
import com.avalliar.api.usuario.Role;
import com.avalliar.api.usuario.Usuario;
import com.avalliar.api.usuario.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("E-mail já cadastrado");
        }

        Role role = request.role() != null ? request.role() : Role.OPERACIONAL;
        Usuario usuario = Usuario.builder()
                .nome(request.nome())
                .email(request.email())
                .senha(passwordEncoder.encode(request.senha()))
                .role(role)
                .build();
        usuarioRepository.save(usuario);

        return buildResponse(usuario);
    }

    public AuthResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Credenciais inválidas"));

        if (!passwordEncoder.matches(request.senha(), usuario.getSenha())) {
            throw new IllegalArgumentException("Credenciais inválidas");
        }

        return buildResponse(usuario);
    }

    private AuthResponse buildResponse(Usuario usuario) {
        return new AuthResponse(
                jwtService.generateToken(usuario),
                usuario.getEmail(),
                usuario.getNome(),
                usuario.getRole().name());
    }
}
