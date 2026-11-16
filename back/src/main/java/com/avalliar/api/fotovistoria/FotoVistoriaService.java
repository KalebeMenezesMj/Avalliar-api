package com.avalliar.api.fotovistoria;

import com.avalliar.api.vistoria.Vistoria;
import com.avalliar.api.vistoria.VistoriaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FotoVistoriaService {

    static final long MAX_BYTES = 15L * 1024 * 1024;
    private static final Map<String, String> EXTENSOES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png");

    private final FotoVistoriaRepository fotos;
    private final VistoriaRepository vistorias;
    private final FotoStorage storage;

    public FotoVistoriaService(FotoVistoriaRepository fotos, VistoriaRepository vistorias, FotoStorage storage) {
        this.fotos = fotos;
        this.vistorias = vistorias;
        this.storage = storage;
    }

    @Transactional
    public FotoVistoria enviar(Long vistoriaId, ComodoFoto comodo, MultipartFile arquivo) {
        Vistoria vistoria = vistoriaAberta(vistoriaId);
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo da foto é obrigatório");
        }
        String tipo = arquivo.getContentType();
        if (tipo == null || !EXTENSOES.containsKey(tipo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato não aceito (use JPEG ou PNG)");
        }
        if (arquivo.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Foto acima de 15 MB");
        }

        int ordem = fotos.findTopByVistoriaIdOrderByOrdemDesc(vistoriaId)
                .map(f -> f.getOrdem() + 1)
                .orElse(1);
        byte[] conteudo;
        try {
            conteudo = arquivo.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não foi possível ler a foto");
        }
        String nome = ordem + "-" + UUID.randomUUID() + "." + EXTENSOES.get(tipo);
        String caminho = storage.salvar(vistoriaId, nome, conteudo);

        return fotos.save(FotoVistoria.builder()
                .vistoria(vistoria)
                .ordem(ordem)
                .comodo(comodo)
                .caminho(caminho)
                .contentType(tipo)
                .tamanhoBytes(conteudo.length)
                .criadaEm(Instant.now())
                .build());
    }

    public List<FotoVistoria> listar(Long vistoriaId) {
        vistoriaExiste(vistoriaId);
        return fotos.findByVistoriaIdOrderByOrdemAsc(vistoriaId);
    }

    public FotoVistoria buscar(Long fotoId) {
        return fotos.findById(fotoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não encontrada"));
    }

    public byte[] conteudo(FotoVistoria foto) {
        return storage.ler(foto.getCaminho());
    }

    @Transactional
    public FotoVistoria atualizarComodo(Long fotoId, ComodoFoto comodo) {
        FotoVistoria foto = buscar(fotoId);
        vistoriaAberta(foto.getVistoria().getId());
        foto.setComodo(comodo);
        return fotos.save(foto);
    }

    @Transactional
    public void remover(Long fotoId) {
        FotoVistoria foto = buscar(fotoId);
        vistoriaAberta(foto.getVistoria().getId());
        storage.remover(foto.getCaminho());
        fotos.delete(foto);
    }

    /** Marca o relatório como pronto para o ML. Exige ao menos uma foto. */
    @Transactional
    public Vistoria finalizar(Long vistoriaId) {
        Vistoria vistoria = vistoriaExiste(vistoriaId);
        if (fotos.findByVistoriaIdOrderByOrdemAsc(vistoriaId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie ao menos uma foto antes de finalizar");
        }
        if (vistoria.getRelatorioFotograficoFinalizadoEm() == null) {
            vistoria.setRelatorioFotograficoFinalizadoEm(Instant.now());
        }
        return vistorias.save(vistoria);
    }

    /** Fotos em ordem de envio, com cômodo, para o ML inserir na planilha. */
    public List<FotoVistoria> paraMl(Long vistoriaId) {
        Vistoria vistoria = vistoriaExiste(vistoriaId);
        if (vistoria.getRelatorioFotograficoFinalizadoEm() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Relatório fotográfico ainda não foi finalizado");
        }
        return fotos.findByVistoriaIdOrderByOrdemAsc(vistoriaId);
    }

    private Vistoria vistoriaExiste(Long vistoriaId) {
        return vistorias.findById(vistoriaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vistoria não encontrada"));
    }

    private Vistoria vistoriaAberta(Long vistoriaId) {
        Vistoria vistoria = vistoriaExiste(vistoriaId);
        if (vistoria.getRelatorioFotograficoFinalizadoEm() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Relatório fotográfico já finalizado");
        }
        return vistoria;
    }
}
