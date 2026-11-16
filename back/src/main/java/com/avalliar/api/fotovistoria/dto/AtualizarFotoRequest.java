package com.avalliar.api.fotovistoria.dto;

import com.avalliar.api.fotovistoria.ComodoFoto;
import jakarta.validation.constraints.NotNull;

public record AtualizarFotoRequest(@NotNull ComodoFoto comodo) {
}
