package com.avalliar.api.health;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@Tag(name = "Health", description = "Verificação de disponibilidade da API")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Health check da API")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "avalliar-api",
                "timestamp", Instant.now().toString());
    }
}
