# 06 — ML: reconhecimento e preenchimento de planilhas

Módulo `ml/` (Python, FastAPI). Reconhece planilhas de homogeneização **V22**
(`.xlsx`, "Unidades Isoladas") e **V25** (`.xlsm`, "padronizadas"), extrai os campos
e preenche a planilha a partir de dados estruturados e/ou de anúncios do VivaReal.

## 1. O que é ML e o que é determinístico

| Parte | Técnica |
|---|---|
| Reconhecedor de template | TF-IDF + Regressão Logística sobre os nomes das abas |
| Mapeador de rótulos | TF-IDF (char n-grams) + Regressão Logística, com classe `__nenhum__` |
| Idade aparente pela foto | RandomForest sobre features da imagem (erro médio 4,2 anos); CNN ResNet18 opcional (`treinar_idade_cnn.py`) |
| Estimadores por amostra (`campos.py`) | RandomForest: `estado_conservacao` (94,4%) e `coluna_ibape` (64,4%) |
| RAG | BM25 sobre laudos reais (`rag.py`) |
| **Preenchimento em si** | **Determinístico**: mapas de célula (`templates.py`, `calc.py`) + `openpyxl` |

## 2. Layout da V22 (derivado de 141 laudos reais de 2025)

- **Cabeçalho / Dados Laudo**: células mapeadas em `templates.CELL_MAP`.
- **`XXX - Dados Calc`**: coluna **C** = imóvel avaliado; colunas **D–H** = até 5 amostras.
  Cada linha é um atributo (mapa completo em `calc.LINHAS`: preço, áreas, idade, estado,
  padrão, endereço, CEP, lat/long, cidade, dormitórios, banheiros, vagas, linha 95 = coluna IBAPE…).
  O preço e a data de referência só existem nas amostras.
- **URLs dos anúncios**: `Amostras01-04` C15/C29/C43/C57 e `Amostras05-08` C15.
- **`XXX - Dados Laudo`**: `G3` (caracterização do imóvel; padrão 1, laudos usam 3) e a tabela
  **CUB/R8N** (`D27` rótulo; `G42:H68` valor R$/m² e competência por UF).
- **Sem entrada digitada** (são fórmulas): Custo01, Custo02, Comparativo, INSPECTOS, BASE INSPECTOS.
  Não se escreve nelas; o Excel recalcula ao abrir.
- Fotos e Croqui **não** são preenchidos.

## 3. Arquivos principais

| Arquivo | Função |
|---|---|
| `app.py` | API FastAPI (endpoints abaixo), download dos artefatos do Blob no startup |
| `fill.py` | Reconhece o template, escreve o cabeçalho, chama `calc` para Dados Calc/CUB |
| `calc.py` | Dados Calc, URLs, CUB, G3: escrever, ler, converter anúncio em amostra |
| `amostras.py` | Busca no VivaReal, seleciona as 5 melhores, completa idade (foto), CEP (ViaCEP) e campos estimados |
| `terreno.py` | Estima área de terreno/frente ausentes nas amostras (evita R$/m² absurdo no Custo01) |
| `selecao_calc.py` | Seleção das amostras por vários critérios (área, idade, padrão, bairro, terreno) |
| `ajuste_valor.py` | Troca de amostras até o valor de mercado (`Comparativo!F39`) chegar perto de `valor_referencia` (V22) |
| `ferramentas/teste_aceite.py` | Teste de aceite: 5 amostras novas do acervo vs. valor do laudo real |
| `vivareal.py` / `selecao.py` | Cliente do VivaReal e seleção por similaridade |
| `campos.py` / `treinar_campos.py` | Estimadores de estado de conservação e coluna IBAPE |
| `coletar_amostras.py` | Extrai o Dados Calc dos laudos reais para treino |
| `templates.py`, `fields.py`, `layout.py`, `derive.py` | Fingerprint, mapa de células, campos canônicos, aprendizado de layout |
| `idade.py`, `treinar_idade*.py` | Idade aparente pela foto |
| `retreino.py`, `dataset.py`, `avaliar.py` | Retreino seguro e avaliação em conjunto reservado |
| `ferramentas/recalc.ps1`, `ferramentas/teste_planilha_inteira.py` | Teste da planilha inteira (Excel COM, Windows) |

## 4. Endpoints do ML

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Estado e modelos carregados |
| POST | `/reconhecer` | Identifica V22/V25 do arquivo enviado |
| POST | `/extrair` | Extrai campos de uma planilha preenchida (inclui Dados Calc) |
| POST | `/preencher` | Preenche o template do servidor com JSON |
| POST | `/preencher-arquivo` | Preenche **o arquivo enviado** (`file` + campo `dados` em JSON) |
| POST | `/idade` | Idade aparente por foto |
| POST | `/retreinar` | Retreino (protegido por `RETRAIN_TOKEN`) |
| GET | `/metricas`, `/consultar` | Métricas e RAG |
| POST/GET | `/arquivos/upload`, `/download`, `/visualizar` | Arquivos por empresa/tarefa |

A API Java expõe `/api/laudos/{preencher, preencher-arquivo, reconhecer, extrair, ml/health, ml/metricas, ml/consultar}`.

## 5. Formato de `dados`

```json
{
  "cliente": "...",
  "caracterizacao_imovel": 3,
  "avaliando": {"area_terreno": 275, "area_equivalente": 149, "idade_aparente": 20},
  "amostras": [{"preco": 550000, "area_equivalente": 153, "url": "https://..."}],
  "busca": {"uf": "sp", "cidade": "Peruíbe", "tipo": "casa", "area": 149, "top_n": 5},
  "cub": {"rotulo": "...", "referencia": "2025-01-01", "valores": {"SP": 2000.5}},
  "valor_referencia": 427000,
  "candidatas": [{"preco": 550000, "area_equivalente": 153, "url": "https://..."}],
  "max_avaliacoes": 4
}
```

Se vier `busca` e não vier `amostras`, o ML pesquisa no VivaReal. A resposta traz
`conteudo_base64`, `campos_preenchidos` e `avisos`. Falha na busca nunca derruba o preenchimento.

### Troca de amostras (V22)

Com `valor_referencia` (valor esperado pelo avaliador), o ML escolhe as 12 melhores entre `candidatas`/`busca`,
preenche, lê `Comparativo!F39` e, se a diferença for maior que 3%, troca o conjunto de 5 amostras (proporcional
ao R$/m² médio) até chegar perto, no máximo `max_avaliacoes` (padrão 4). Cada avaliação recalcula a planilha (~40 s
em produção). A resposta traz o valor obtido e o número de avaliações. Sem `valor_referencia` o comportamento é o de antes.

## 6. Resultados medidos

| Teste | Resultado |
|---|---|
| Planilha inteira recalculada no Excel (8 laudos, 22 abas, sem fotos/croqui) | 73.247/73.251 = 99,99% (antes: 92,1%) |
| Após a última refatoração (3 laudos) | 27.326/27.326 = 100% |
| Dados Calc ida e volta (141 laudos) | 26.671/26.671 = 100% |
| `test_fields.py` | 90/90 |
| Produção Azure com amostras enviadas | 22 células corretas |
| Aceite, 24 laudos, 5 amostras novas, só por similaridade | 17–19/24 dentro de ±15%; erro médio 11–13% |
| Aceite, 24 laudos, com troca de amostras (referência = valor do laudo real) | 22/24 dentro de ±15%; erro médio 4,9%; mediana 2,9%; 14/24 dentro de 3% |

O teste de aceite usa o valor do laudo real como referência, então mede o mecanismo de troca e não a previsão às cegas.

As 4 células divergentes são fórmulas com valor antigo em cache no laudo do avaliador.

## 7. Limitações conhecidas

- **VivaReal bloqueia IPs da Azure** (Cloudflare 403). A busca automática funciona fora da Azure;
  em produção o front/middleware deve buscar e enviar `amostras`. O ML devolve aviso.
- **CUB**: tabela do template é de mar/2023; sem fonte atual. Enviar `dados.cub`, senão sai aviso.
- **`coluna_ibape`** é escolha subjetiva (64%): marcada como "estimada, revisar".
- `campos_amostra.joblib` precisa estar no Blob (ver `checkpoint.md`); sem ele, estado = 3 e IBAPE = padrão do template.
- **Valores calculados**: `recalc.py` roda o LibreOffice (headless, pt-BR) numa cópia e grava o resultado como cache nas fórmulas do arquivo devolvido (Dados Calc, Custo01/02, Amostras, INSPECTOS, Comparativo…). O Excel ainda recalcula ao abrir (`fullCalcOnLoad`). Validado contra o Excel: 100% em 6 laudos (`ferramentas/teste_cache.py`). A cópia aplica a semântica do Excel em `ISBLANK(x)=0` (Custo01). Cada chamada leva ~40 s (container 0,25 vCPU).
- **Troca de amostras** só vale para a V22; na V25 ainda não. R$/m² por amostra continua instável mesmo com o valor total próximo.
- **V25**: a aba `AMOSTRA DADOS` (que alimenta Pesquisas, HOMOGENEIZACAO, INSPECTOS e Comparativo) ainda não é preenchida.
- A planilha devolvida perde imagens e listas suspensas (limitação do `openpyxl`).
- `/preencher` (código de colega) devolve uma planilha **inventada** se o template não estiver no servidor — recomenda-se remover.
- Idade pela foto: erro médio de 4,2 anos.
