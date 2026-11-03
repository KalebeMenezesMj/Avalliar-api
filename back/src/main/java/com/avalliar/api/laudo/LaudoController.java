package com.avalliar.api.laudo;

import com.avalliar.api.laudo.dto.PreencherLaudoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/laudos")
@Tag(name = "Laudos", description = "Geração de planilhas de homogeneização via módulo de ML")
public class LaudoController {

    private final MlClientService mlClientService;

    public LaudoController(MlClientService mlClientService) {
        this.mlClientService = mlClientService;
    }

    @PostMapping("/preencher")
    @Operation(summary = "Preenche uma planilha de homogeneização via ML")
    public Map<String, Object> preencher(@Valid @RequestBody PreencherLaudoRequest request) {
        return mlClientService.preencher(request.templateId(), request.dados());
    }
}
