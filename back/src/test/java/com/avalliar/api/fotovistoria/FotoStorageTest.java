package com.avalliar.api.fotovistoria;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class FotoStorageTest {

    @TempDir
    Path pasta;

    @Test
    void gravaLeERemoveFotoDentroDaPasta() {
        FotoStorage storage = new FotoStorage(pasta.toString(), "", "fotos");
        byte[] conteudo = {1, 2, 3};

        String caminho = storage.salvar(7L, "1-abc.jpg", conteudo);

        assertEquals("7/1-abc.jpg", caminho);
        assertArrayEquals(conteudo, storage.ler(caminho));
        storage.remover(caminho);
        assertThrows(Exception.class, () -> storage.ler(caminho));
    }

    @Test
    void recusaCaminhoQueSaiDaPasta() {
        FotoStorage storage = new FotoStorage(pasta.toString(), "", "fotos");

        assertThrows(IllegalArgumentException.class, () -> storage.ler("../../etc/passwd"));
        assertThrows(IllegalArgumentException.class, () -> storage.remover("../fora.jpg"));
    }
}
