package com.avalliar.api.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Avalliar API",
                version = "1.0.0",
                description = "API do sistema **Avalliar** — automação de vistoria e avaliação imobiliária. "
                        + "MVP: autenticação via JWT, comunicação com PostgreSQL e disponibilidade de dados "
                        + "para o aplicativo mobile.",
                contact = @Contact(name = "Equipe Avalliar", email = "kalebe.menezesmj@gmail.com")),
        security = @SecurityRequirement(name = "bearerAuth"))
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Informe o token JWT obtido em /api/auth/login")
public class OpenApiConfig {
}
