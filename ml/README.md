# Módulo de Machine Learning — Avalliar

Módulo em **Python** responsável por **reconhecer** a planilha de homogeneização
e **aprender a preencher** os campos com as informações recebidas.

> Implementa a parte de IA dos requisitos RF12 (identificar o modelo de planilha),
> RF13 (preencher automaticamente) e RF14 (reconhecer padrões via ML).

## Como funciona

Duas tarefas de ML + um mapeamento de layout:

| Componente | Tipo | O que faz |
|---|---|---|
| **Reconhecedor de template** | ML (classificação) | Dada uma planilha, identifica se é o modelo **V22 (Unidades Isoladas)** ou **V25 (padronizadas)**. Aprende a partir dos nomes das abas. |
| **Mapeador de campos** | ML (classificação de texto) | Aprende a traduzir o rótulo de uma coluna (ex.: `"Área privativa (m²)"`, `"AREA PRIVATIVA DO APTO"`) para o campo canônico (`area_privativa`). Generaliza para variações de nome. |
| **Mapa de células** (`templates.py`) | Configuração | Diz, para cada template, **em qual célula** cada campo canônico é escrito (reverse-engineered da planilha real). |

O preenchimento (`fill.py`) junta os três: **reconhece** o template, **mapeia** os
campos e **escreve** os valores nas células corretas com `openpyxl`.

## Estrutura

```
ml/
├── fields.py        # campos canônicos + exemplos de treino (rótulo → campo)
├── templates.py     # templates, mapa de células e fingerprint
├── train.py         # treina os dois modelos (salva em models/)
├── fill.py          # reconhece + preenche um arquivo (CLI) + extrai de um laudo
├── layout.py        # APRENDE o layout da planilha a partir de laudos preenchidos
├── derive.py        # aprende o mapa de células a partir de laudos preenchidos
├── test_learn.py      # teste: aprende com N laudos e preenche os outros
├── test_roundtrip.py  # teste de ida e volta (nível de célula)
├── test_fields.py     # teste por campo (ML de verdade: entender -> extrair -> posicionar)
├── test_recognizer.py # teste do reconhecedor (inclui generalização)
├── test_v25_consistency.py # consistência do mapa de células do V25
├── demo.py          # demo ponta a ponta
├── data/templates/  # planilhas de modelo (gitignored)
├── data/output/     # planilhas preenchidas (gitignored)
└── models/          # modelos treinados .joblib (gitignored)
```

## Como usar (CLI)

Depois de treinar uma vez (`python train.py` ou o próprio `demo.py`), use:

```bash
# 1. Treinar os modelos (uma vez)
cd ml
python train.py

# 2. Descobrir qual template é um arquivo
python fill.py reconhecer "caminho/da/planilha.xlsx"

# 3. Preencher um template com um JSON de dados
python fill.py preencher "caminho/do/template.xlsx" dados.json "saida_preenchida.xlsx"
```

O JSON de dados usa os **campos canônicos** como chaves (ver `exemplo_dados.json`):
`numero_proposta`, `cliente`, `tipologia`, `endereco`, `area_privativa`, etc.

## Demo completa

```bash
cd ml
python demo.py
```

O demo:
1. treina os dois modelos (se ainda não existirem);
2. reconhece os dois templates de exemplo;
3. preenche ambos com dados de exemplo e salva em `data/output/`;
4. mostra o mapeador generalizando para rótulos nunca vistos no treino.

## Testes

Quatro testes de validação, rodando sobre **laudos reais** (a pasta `2025/` do
ambiente da equipe):

```bash
python test_roundtrip.py 30   # nível de célula
python test_fields.py 30      # nível de campo (ML)
python test_recognizer.py 30  # reconhecimento + generalização
python test_v25_consistency.py
```

**`test_roundtrip.py`** — extrai todas as células de entrada de um laudo pronto,
preenche o template em branco e compara célula a célula. Valida a mecânica de
escrita e a **estabilidade do layout** (as posições das células são idênticas em
todos os laudos).

**`test_fields.py`** — o teste que realmente exercita o ML: o mapeador
**entende os rótulos** do laudo (`CLIENTE`, `N° DA PROPOSTA`, `ESTADO:`…),
extrai o valor de cada campo e o coloca na célula do template. Compara com o
laudo original. Aqui a extração é restrita à aba onde o campo é escrito, o que
desambigua rótulos repetidos (ex.: `UF` existe como cabeçalho da tabela R8N e
como campo do laudo).

**`test_recognizer.py`** — cada laudo deve ser identificado como V22. Separa os
laudos **vistos** no treino dos **não vistos** (generalização real).

**`test_v25_consistency.py`** — não temos laudo V25 preenchido, mas as fórmulas
das outras abas referenciam exatamente as células de entrada de
`DADOS DO IMÓVEL`. O teste confere que o mapa aponta para essas células e que
nenhuma ficou de fora (foi assim que se descobriu que a coluna de valores é a
**C**, e não a D).

### Resultados

| Teste | Resultado |
|---|---|
| Round-trip (30 laudos, todas as células de entrada) | **6620/6620 — 100%** |
| Por campo (30 laudos × 9 campos) | **270/270 — 100%** |
| Reconhecedor (30 laudos) | **30/30 — 100%** |
| Reconhecedor em laudos **não vistos** no treino | **10/10 — 100%** |
| Consistência do mapa V25 | **31/31 — 100%** |

## Extrair dados de um laudo

`fill.extract(template_id, caminho_do_laudo)` devolve `{campo: valor}` — a
"informação recebida" no formato canônico, pronta para ser gravada em outro
template:

```python
import fill
dados = fill.extract("v22_unidades_isoladas", "laudo_preenchido.xlsx")
# {'cliente': 'ITAÚ', 'numero_proposta': 10035612, 'uf': 'São Paulo', ...}
```

## Serviço FastAPI (integração com a API Java)

O módulo é exposto como um serviço HTTP que a API Spring Boot consome:

```bash
cd ml
python train.py                          # treina os modelos (uma vez)
uvicorn app:app --host 0.0.0.0 --port 8000
```

| Método | Rota | Entrada | Saída |
|---|---|---|---|
| GET | `/health` | — | status + templates disponíveis |
| POST | `/reconhecer` | upload de arquivo | `{template_id}` |
| POST | `/extrair?template_id=` | upload de laudo | `{campos: {...}}` |
| POST | `/preencher` | `{template_id, dados}` | planilha em `conteudo_base64` |

Exemplo:

```bash
curl -X POST http://localhost:8000/preencher \
  -H "Content-Type: application/json" \
  -d '{"template_id":"v25_unidades_padronizadas","dados":{"cliente":"Banco Exemplo S.A.","area_privativa":68.5}}'
```

A API Java chama esse serviço em `POST /api/laudos/preencher` (ver `../back/`).

## RAG leve (BM25 offline)

Consulta o acervo — tabelas de referência (**CUB/R8N por estado/competência**)
e **laudos anteriores** — e devolve os trechos mais relevantes **com a fonte**.

```bash
python rag.py --build                       # (re)constrói o corpus (87 chunks)
python rag.py "qual o R8N de Sao Paulo"      # consulta com fonte
python rag.py "casa Praia Grande"
```

Também disponível como endpoint do serviço: `GET /consultar?q=...`.

A fonte aponta o arquivo/aba/célula de onde o dado veio (ex.:
`V22 · XXX - Dados Laudo!F66:H66`), o que permite conferir a origem da resposta.

## Aprender o layout da planilha (layout.py)

Esta é a peça que **elimina o mapa de células decorado**. Em vez de alguém
mapear "cliente → P6" à mão, o sistema aprende olhando laudos preenchidos:

1. **Descobre as células de entrada** — diff determinístico entre o template em
   branco e o laudo preenchido (nada de chute);
2. **Nomeia cada célula** — o ML classifica o rótulo vizinho (`CLIENTE`,
   `ESTADO:`, `N° DA PROPOSTA`…) e descobre a que campo canônico pertence;
3. **Consolida** por votação entre vários laudos e grava o layout.

```bash
python test_learn.py   # aprende com N laudos e preenche os outros
```

**Por que isso importa:** para um cliente novo, basta entregar **um laudo
preenchido por tipologia** e o sistema passa a preencher os demais sozinho.

Resultados (V22, laudos reais da pasta `2025/`):

| Laudos de referência | Células descobertas | Acerto ao preencher os outros |
|---|---|---|
| 1 | 221 | **97,3%** |
| 3 | 225 | **98,2%** |
| 5 | 231 | **99,5%** |
| **24 (uma por tipologia)** | 264 | **99,9%** |

O que faltava para os 100% eram **campos condicionais** — o `C50='ESQUINA'`
(só em imóvel de esquina) e o `G58`, que não aparecem em nenhum dos laudos de
referência. Por isso a referência precisa ser **diversa** (uma por tipologia) e
não os primeiros N da lista: com 24 tipologias, 7 dos 8 laudos testados saíram
**100%** e os 2 misses foram exatamente esses campos condicionais.

## Aprender o mapa de células (derive.py)

Em vez de depender só do mapa decorado (`templates.py`), o `derive.py` **aprende
onde cada campo fica** observando laudos já preenchidos: escaneia os rótulos,
classifica com o mapeador e registra a célula de valor ao lado (votação entre
vários arquivos).

```bash
python derive.py
```

Estado atual (validado com 8 laudos reais de 2025):
- ✅ Recupera corretamente os campos do cabeçalho do laudo
  (`cliente → XXX - Dados Laudo!P6`, `numero_proposta → P8`,
  `tipo_laudo → P11`, `engenheiro_responsavel → P15`);
- ⚠️ Ainda é ruidoso em abas densas de cálculo (`XXX - Dados Calc` etc.) —
  precisa filtrar apenas abas de entrada e melhorar a detecção da célula de valor.

## Campos canônicos

Os campos (`fields.CANONICAL_FIELDS`) alinham o `campo_canonico` do `schema.sql`
com os rótulos reais das planilhas: `cliente`, `numero_proposta`, `tipo_laudo`,
`matricula`, `tipologia`, `endereco`, `bairro`, `cidade`, `uf`, `cep`, `latitude`,
`longitude`, `area_privativa`, `valor_avaliacao`, `estado_conservacao`, etc.

## Próximos passos

- Treinar o reconhecedor com **mais** exemplos rotulados (as pastas mensais de
  `2025/` têm centenas de laudos preenchidos — V22);
- Adicionar o template **V25 preenchido** (as pastas de 2026) para balancear as classes;
- Refinar o `derive.py`: filtrar apenas abas de entrada e melhorar a detecção da
  célula de valor, para auto-derivar o mapa completo sem depender do decorado;
- Expor o módulo como um pequeno serviço (FastAPI) consumido pela API Spring Boot.
