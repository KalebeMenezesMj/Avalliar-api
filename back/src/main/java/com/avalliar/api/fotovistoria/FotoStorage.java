package com.avalliar.api.fotovistoria;

import com.azure.storage.file.share.ShareClient;
import com.azure.storage.file.share.ShareClientBuilder;
import com.azure.storage.file.share.ShareDirectoryClient;
import com.azure.storage.file.share.ShareFileClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Grava e lê as fotos da vistoria no Azure Files (compartilhamento {@code fotos}).
 * Sem string de conexão, usa uma pasta local (desenvolvimento e testes).
 * Os caminhos guardados no banco são relativos ao compartilhamento: {@code vistoriaId/nome.jpg}.
 */
@Component
public class FotoStorage {

    private final ShareClient compartilhamento;
    private final Path raizLocal;

    public FotoStorage(@Value("${app.fotos.diretorio:./data/fotos}") String diretorio,
                       @Value("${app.fotos.azure.connection-string:}") String connectionString,
                       @Value("${app.fotos.azure.share:fotos}") String share) {
        if (connectionString == null || connectionString.isBlank()) {
            this.compartilhamento = null;
            this.raizLocal = Path.of(diretorio).toAbsolutePath().normalize();
            try {
                Files.createDirectories(raizLocal);
            } catch (IOException e) {
                throw new UncheckedIOException("Não foi possível criar a pasta de fotos: " + raizLocal, e);
            }
        } else {
            this.compartilhamento = new ShareClientBuilder()
                    .connectionString(connectionString)
                    .shareName(share)
                    .buildClient();
            this.compartilhamento.createIfNotExists();
            this.raizLocal = null;
        }
    }

    public String salvar(Long vistoriaId, String nomeArquivo, byte[] conteudo) {
        return salvarEm(String.valueOf(vistoriaId), nomeArquivo, conteudo);
    }

    /**
     * Grava um arquivo numa pasta do compartilhamento (ex.: {@code relatorios/12}).
     * Devolve o caminho relativo, que é o que se guarda no banco.
     */
    public String salvarEm(String pasta, String nomeArquivo, byte[] conteudo) {
        if (pasta == null || pasta.isBlank() || pasta.contains("..") || pasta.startsWith("/")
                || nomeArquivo == null || nomeArquivo.isBlank() || nomeArquivo.contains("/")
                || nomeArquivo.contains("..")) {
            throw new IllegalArgumentException("Nome de arquivo inválido");
        }
        String caminho = pasta + "/" + nomeArquivo;
        if (compartilhamento != null) {
            ShareDirectoryClient diretorio = compartilhamento.getDirectoryClient(pasta);
            diretorio.createIfNotExists();
            ShareFileClient arquivo = diretorio.getFileClient(nomeArquivo);
            arquivo.create(conteudo.length);
            arquivo.uploadRange(new ByteArrayInputStream(conteudo), conteudo.length);
            return caminho;
        }
        try {
            Path diretorio = raizLocal.resolve(pasta);
            Files.createDirectories(diretorio);
            Files.write(diretorio.resolve(nomeArquivo), conteudo);
            return caminho;
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gravar o arquivo", e);
        }
    }

    public byte[] ler(String caminho) {
        validar(caminho);
        if (compartilhamento != null) {
            try (var entrada = compartilhamento.getFileClient(caminho).openInputStream()) {
                return entrada.readAllBytes();
            } catch (IOException e) {
                throw new UncheckedIOException("Falha ao ler a foto no Azure Files", e);
            }
        }
        try {
            return Files.readAllBytes(raizLocal.resolve(caminho).normalize());
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao ler a foto", e);
        }
    }

    public void remover(String caminho) {
        validar(caminho);
        if (compartilhamento != null) {
            compartilhamento.getFileClient(caminho).deleteIfExists();
            return;
        }
        try {
            Files.deleteIfExists(raizLocal.resolve(caminho).normalize());
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao remover a foto", e);
        }
    }

    /** Recusa caminhos que tentem sair do compartilhamento ou da pasta local. */
    private void validar(String caminho) {
        if (caminho == null || caminho.isBlank() || caminho.contains("..") || caminho.startsWith("/")) {
            throw new IllegalArgumentException("Caminho de foto inválido");
        }
        if (raizLocal != null && !raizLocal.resolve(caminho).normalize().startsWith(raizLocal)) {
            throw new IllegalArgumentException("Caminho fora da pasta de fotos");
        }
    }
}
