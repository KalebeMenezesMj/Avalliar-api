# Checkpoint — 13/11/2026

Estado do projeto Avalliar (FATEC Praia Grande) ao final desta sessão. Ver detalhes em `docs/06` a `docs/08`.

## Concluído

- `/preencher-arquivo` (ML) e `/api/laudos/{preencher-arquivo,reconhecer,extrair}` (Java): preenche **o arquivo enviado**.
- V22 preenchida por inteiro: Dados Calc (coluna C avaliado, D–H amostras), URLs das Amostras, CUB, G3, linha 95.
  Custo/Comparativo/INSPECTOS são fórmulas e recalculam no Excel.
- Busca de amostras no VivaReal + idade pela foto + CEP (ViaCEP) + estimadores de estado e coluna IBAPE.
- Validação: planilha inteira 99,99–100%; Dados Calc ida e volta 100% (141 laudos); `test_fields` 90/90.
- Deploy: ML `avalliar-ml:v10` (LibreOffice, valores calculados, estimativa de terreno, seleção por critérios e troca de amostras até o valor de referência), API `avalliar-api:v3`. Commits `d59b0bc` e `21d5188` em `main`.
- Aceite (24 laudos, 5 amostras novas): 22/24 dentro de ±15%, erro médio 4,9% com troca de amostras (`valor_referencia`); só similaridade: 17–19/24.
- Upload multipart do Spring em 30 MB.
- PDF-resumo na área de trabalho: `Avalliar-ML-Resumo-Alteracoes.pdf`.

## Pendências (ordem sugerida)

0. **V25: preencher `AMOSTRA DADOS`** (alimenta as demais abas). Avaliar subir CPU do ML (40 s por chamada).
1. **Subir `ml/models/campos_amostra.joblib` ao Blob** (precisa de *Storage Blob Data Contributor*; comando em `docs/07`). Sem isso, em produção estado = 3 e IBAPE = padrão.
2. **VivaReal bloqueado na Azure**: decidir busca no cliente (front/middleware envia `amostras`) ou proxy com IP residencial.
3. **CUB atual**: definir fonte; hoje o template tem mar/2023 e a resposta traz aviso.
4. **Remover o fallback que inventa planilha** em `/preencher` (`_gerar_planilha_bytes`, valores como "PROP-2026-0842").
5. Segurança: `DB_PASSWORD` para secret, Swagger off em produção, rotacionar `RETRAIN_TOKEN`.
6. Melhorar o modelo de idade pela foto (erro médio 4,2 anos) e a coluna IBAPE (64%).
7. Devolver a planilha sem perder imagens/listas suspensas (hoje `openpyxl` as descarta).
8. `test_avaliacao.py` ainda não rodado localmente (precisa do banco).
9. Pergunta antiga sem resposta: cópia do `.env` na área de trabalho.

## Como retomar

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
