package com.avalliar.api.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Avalliar API",
                version = "1.0.0",
                description = "API do sistema **Avalliar** — automação de vistoria e avaliação imobiliária. "
                        + "MVP: comunicação com PostgreSQL e disponibilidade de dados para o aplicativo mobile.",
                contact = @Contact(name = "Equipe Avalliar", email = "kalebe.menezesmj@gmail.com")))
public class OpenApiConfig {
}
