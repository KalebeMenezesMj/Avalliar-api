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
├── fill.py          # reconhece + preenche um arquivo (CLI)
├── derive.py        # aprende o mapa de células a partir de laudos preenchidos
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
