# Avalliar API — Back-end

API REST do sistema **Avalliar**, construída com **Java + Spring Boot** e banco **PostgreSQL**.

> Este é o MVP da API: autenticação (JWT), comunicação com o banco e disponibilidade de dados para o mobile.
> Documentação completa do projeto: [`../docs/`](../docs/) e [`../README.md`](../README.md).

## Stack

| Item | Tecnologia |
|---|---|
| Linguagem | Java 21 |
| Framework | Spring Boot 3.5.x |
| Persistência | Spring Data JPA |
| Banco | PostgreSQL 16 |
| Segurança | Spring Security + JWT (jjwt) |
| Documentação | Swagger / OpenAPI (springdoc) |

## Como rodar (Docker)

O projeto roda inteiro em Docker — não é preciso instalar Java/Maven localmente.

```bash
# na raiz do repositório (Avalliar-api/)
docker compose up --build
```

Isso sobe dois serviços:

- **postgres** — banco PostgreSQL em `localhost:5432` (db `avalliar`, user `avalliar`, senha `avalliar`);
- **api** — a aplicação em `localhost:8080`.

Para subir apenas o banco:

```bash
docker compose up -d postgres
```

Para parar tudo:

```bash
docker compose down
```

## Acessos

| Recurso | URL |
|---|---|
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI (JSON) | http://localhost:8080/v3/api-docs |
| Health check | http://localhost:8080/health |

### Usuários de teste (criados automaticamente)

| E-mail | Senha | Role |
|---|---|---|
| `admin@avalliar.com` | `admin123` | ADMIN |
| `avaliador@avalliar.com` | `avaliar123` | AVALIADOR |
| `gestor@avalliar.com` | `gestor123` | GESTOR |
| `vistoriador@avalliar.com` | `vistoriador123` | VISTORIADOR |
| `operacional@avalliar.com` | `operacional123` | OPERACIONAL |

## Autenticação (opcional)

A API possui autenticação **JWT**, mas ela é **opcional**: todos os endpoints podem ser acessados sem token.

Para testar o fluxo de login (disponível, porém não obrigatório):

1. `POST /api/auth/login` com `{ "email": "...", "senha": "..." }` → retorna um `token`;
2. Se desejar, envie o token no header `Authorization: Bearer <token>`.

## Endpoints

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| POST | `/api/auth/register` | Registrar usuário | público |
| POST | `/api/auth/login` | Autenticar | público |
| GET | `/health` | Health check | público |
| GET/POST/PUT/DELETE | `/api/clientes` | CRUD de clientes | público |
| GET/POST/PUT/DELETE | `/api/imoveis` | CRUD de imóveis | público |
| GET/POST/PUT/DELETE | `/api/vistoriadores` | CRUD de vistoriadores | público |
| GET/POST/PUT/DELETE | `/api/ordens-servico` | CRUD de OS | público |
| POST | `/api/laudos/preencher` | Preenche planilha de homogeneização via ML | público |

## Módulo de ML (integração)

O endpoint `/api/laudos/preencher` encaminha os dados para o **serviço de ML em
Python** (FastAPI, no diretório [`../ml/`](../ml/)) e devolve a planilha
preenchida em base64.

```json
// POST /api/laudos/preencher
{
  "templateId": "v25_unidades_padronizadas",
  "dados": { "cliente": "Banco Exemplo S.A.", "area_privativa": 68.5 }
}
```

Para isso funcionar, o serviço de ML precisa estar de pé:

```bash
cd ml
python train.py                          # treina os modelos (uma vez)
uvicorn app:app --host 0.0.0.0 --port 8000
```

A URL do serviço é configurável via `app.ml.url` (default `http://localhost:8000`).

## Estrutura do código

```
src/main/java/com/avalliar/api/
├── auth/              # login e registro (JWT)
├── usuario/           # entidade de usuário e roles
├── cliente/           # clientes
├── imovel/            # imóveis
├── vistoriador/       # vistoriadores
├── ordemservico/      # ordens de serviço
├── security/          # JwtService
├── config/            # segurança, OpenAPI, seed de dados
├── health/            # health check
└── common/exception/  # tratamento de erros
```

## Observações

- As tabelas são criadas automaticamente pelo Hibernate (`ddl-auto: update`).
- Dados de exemplo (5 usuários, 6 clientes, 8 imóveis, 5 vistoriadores e 10 OS) são inseridos no primeiro boot via `DataSeeder`.
- O `schema.sql` completo do produto final está na raiz do repositório, como referência de evolução.
