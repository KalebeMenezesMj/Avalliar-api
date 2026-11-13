# 08 — Guia do desenvolvedor

## Estrutura do monorepo

```
Avalliar-api/
├── back/    Java 21 + Spring Boot (JWT, PostgreSQL). Pacotes em com.avalliar.api:
│            auth, usuario, cliente, imovel, ordemservico, vistoria, vistoriador, amostra,
│            templateplanilha, laudo (proxy para o ML), eventoos, health, security, config, common
├── front/   React Native / Expo (equipe de front). screens/, components/, services/ (api, auth,
│            demanda, ml, user). Destaques: PlanilhaPreenchimentoModal, FileViewerModal, PainelScreen
├── ml/      Python FastAPI (ver docs/06)
├── docs/    Documentação (01..08)
├── schema.sql, docker-compose.yml
├── checkpoint.md   Estado atual e pendências
```

## Rodar localmente

```bash
# Banco + API
docker compose up -d
cd back && ./mvnw spring-boot:run

# ML
cd ml && pip install -r requirements.txt
python train.py                 # treina reconhecedor e mapeador
uvicorn app:app --port 8000

# Front
cd front && npm install && npx expo start
```

## Testes

| Onde | Comando | Observação |
|---|---|---|
| ML campos | `python test_fields.py` | 90/90 |
| ML reconhecedor | `python test_recognizer.py` | |
| ML ida e volta | `python test_roundtrip.py`, `test_learn.py`, `test_v25_consistency.py` | |
| ML avaliação | `python test_avaliacao.py` | precisa do banco |
| Planilha inteira | `python ml/ferramentas/teste_planilha_inteira.py` | Windows + Excel (COM); compara toda célula, exceto Fotos/Croqui, com o laudo real |

## Convenções

- Commits com o e-mail do autor; **sem** linhas de co-autoria de ferramentas.
- Nunca commitar senhas, SAS, templates de cliente nem laudos reais (repositório público).
- Não apagar os arquivos originais ao tratar laudos; trabalhar em cópia.
- Mudou o layout da V22? Atualize `calc.LINHAS` / `templates.CELL_MAP` e rode `test_fields.py` e o teste da planilha inteira.
- Campos que não são "rótulo + valor adjacente" ficam em `calc.CAMPOS_LAUDO`, não no `CELL_MAP` (que também alimenta a extração).
