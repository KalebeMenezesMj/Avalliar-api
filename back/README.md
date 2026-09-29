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

## Autenticação

A API usa **JWT Bearer**. Fluxo:

1. `POST /api/auth/login` com `{ "email": "...", "senha": "..." }` → retorna um `token`;
2. Envie o token no header `Authorization: Bearer <token>` nas demais requisições.

No Swagger UI, clique em **Authorize** e cole o token.

## Endpoints

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| POST | `/api/auth/register` | Registrar usuário | público |
| POST | `/api/auth/login` | Autenticar | público |
| GET | `/health` | Health check | público |
| GET | `/api/clientes` | Listar clientes | autenticado |
| POST | `/api/clientes` | Cadastrar cliente | autenticado |
| PUT | `/api/clientes/{id}` | Atualizar cliente | autenticado |
| DELETE | `/api/clientes/{id}` | Excluir cliente | ADMIN |
| GET/POST/PUT | `/api/imoveis` | CRUD de imóveis | autenticado (DELETE: ADMIN) |
| GET/POST/PUT | `/api/vistoriadores` | CRUD de vistoriadores | autenticado (DELETE: ADMIN) |
| GET/POST/PUT | `/api/ordens-servico` | CRUD de OS | autenticado (DELETE: ADMIN) |

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
- Dados de exemplo (clientes, imóveis, vistoriadores e uma OS) são inseridos no primeiro boot via `DataSeeder`.
- O `schema.sql` completo do produto final está na raiz do repositório, como referência de evolução.
