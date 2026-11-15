# Checkpoint — 15/11/2026

Estado do projeto Avalliar (FATEC Praia Grande) ao final desta sessão. Ver detalhes em `docs/06` a `docs/08`.

## Concluído

- `/preencher-arquivo` (ML) e `/api/laudos/{preencher-arquivo,reconhecer,extrair}` (Java): preenche **o arquivo enviado**.
- V22 preenchida por inteiro: Dados Calc (coluna C avaliado, D–H amostras), URLs das Amostras, CUB, G3, linha 95.
  Custo/Comparativo/INSPECTOS são fórmulas e recalculam no Excel.
- Busca de amostras no VivaReal + idade pela foto + CEP (ViaCEP) + estimadores de estado e coluna IBAPE.
- Validação: planilha inteira 99,99–100%; Dados Calc ida e volta 100% (141 laudos); `test_fields` 90/90.
- Deploy: ML `avalliar-ml:v17` (scrapper do VivaReal 100% na VPS via proxies residenciais DataImpulse já no secret `vivareal-proxy`, com `curl_cffi`; relay local fica só de fallback não configurado; cache 30 min e `/diag/vivareal`), API `avalliar-api:v3`. Commits `d59b0bc` e `21d5188` em `main` (mudanças do VivaReal ainda não commitadas).
- Aceite (24 laudos, 5 amostras novas): 22/24 dentro de ±15%, erro médio 4,9% com troca de amostras (`valor_referencia`); só similaridade: 17–19/24.
- Upload multipart do Spring em 30 MB.
- PDF-resumo na área de trabalho: `Avalliar-ML-Resumo-Alteracoes.pdf`.

- Troca de amostras (`valor_referencia`, `candidatas`, `max_avaliacoes`) em produção na v10; 10 planilhas V22 geradas em produção sem referência: 7/10 dentro de ±15%.
- Branches: `main` contém tudo do ML (a `feat/ml-planilhas` já está integrada); `feature/tela-de-configuracoes` (front) tem 2 commits ainda não integrados.

- VivaReal funcionando na Azure (proxy + curl_cffi). Container 1 vCPU/2 GiB. Ao vivo + `valor_referencia`: 8/9 dentro de ±15%, erro médio 4,8%; sem referência ~19% (ver docs/06). Imagem atual `avalliar-ml:v22`.

## Pendências (ordem sugerida)

0. **V25: preencher `AMOSTRA DADOS`** (alimenta as demais abas) e estender a troca de amostras à V25. Subir CPU do ML (40 s por avaliação; com troca passa de 2 min e pode estourar o timeout do ingress).
1. **Conferir `campos_amostra.joblib` no Blob** (comando em `docs/07`); sem ele, estado = 3 e IBAPE = padrão.
2. **VivaReal bloqueado na Azure**: RESOLVIDO na v17 (15/11) — 100% na VPS via **proxies residenciais DataImpulse** (secret `vivareal-proxy`) com fingerprint de Chrome (`curl_cffi`); cadeia agora é proxy → (relay opcional, removido da produção) → direta; cache 30 min; `/diag/vivareal` confirma busca OK via `proxy[0]`. Restam: (a) definir quem informa `valor_referencia`; (b) commitar as mudanças; (c) confirmar se a conta DataImpulse é gratuita/permanente — se expirar, criar ScrapingAnt grátis (sem cartão) e setar `VIVAREAL_SCRAPIANT`.
   - Definir o critério de aceite oficial (±15% foi adotado nos testes).
3. **CUB atual**: definir fonte; hoje o template tem mar/2023 e a resposta traz aviso.
4. **Remover o fallback que inventa planilha** em `/preencher` (`_gerar_planilha_bytes`, valores como "PROP-2026-0842").
5. Segurança: `DB_PASSWORD` para secret, Swagger off em produção, rotacionar `RETRAIN_TOKEN`.
6. Melhorar o modelo de idade pela foto (erro médio 4,2 anos) e a coluna IBAPE (64%).
7. Devolver a planilha sem perder imagens/listas suspensas (hoje `openpyxl` as descarta).
8. `test_avaliacao.py` ainda não rodado localmente (precisa do banco).
9. Pergunta antiga sem resposta: cópia do `.env` na área de trabalho.

## Como retomar (outra máquina)

```bash
git pull origin main
cd ml && python test_fields.py            # deve dar 90/90
python ferramentas/teste_planilha_inteira.py   # Windows + Excel
```

Dados de trabalho: `D:\Avalliar\` (laudos copiados, scripts, datasets). Laudos originais: `C:\Users\Kalebe\Desktop\2025` (intactos).

## Decisões fixas

- Preenchimento é determinístico; ML só reconhece, mapeia rótulos, estima idade/estado/IBAPE e faz RAG.
- Templates de cliente nunca vão ao repositório público; ficam no Blob privado.
- Falha de busca/estimativa gera `avisos`, nunca derruba o preenchimento.
