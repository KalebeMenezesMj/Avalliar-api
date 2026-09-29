# 5. MVP — Escopo e Planejamento da API

> Resumo das decisões da equipe. Objetivo: **prototipar o back-end para a apresentação**, sem pressa e com planejamento, entregando um **MVP de API** apresentável.

## 5.1 Objetivo do MVP

Entregar uma **API padrão em Java + Spring Boot** com as três funcionalidades mais simples e apresentáveis:

1. **Autenticação** — login seguro de usuários;
2. **Comunicação com o banco** — persistência/leitura no PostgreSQL;
3. **Disponibilidade de dados para o mobile** — endpoints REST consumidos pelo app.

**Estratégia de apresentação:** mostrar o protótipo com essas funcionalidades funcionando e, em seguida, apresentar as **implementações futuras** (processamento de e-mail, ML, pesquisa de mercado, geração de laudos etc.).

## 5.2 Decisões técnicas

| Decisão | Escolha |
|---|---|
| Linguagem | **Java** |
| Framework | **Spring Boot** |
| Banco de dados | **PostgreSQL** |
| Estilo da API | **REST padrão** |
| Autenticação | **JWT** (Spring Security + jjwt) — decidido |
| Versionamento | **Git** (repositório a criar) |
| Estrutura | **Monorepo** — diretórios `back/` e `front/` (padrão do PG360) |

## 5.3 Estrutura do repositório

```
Avalliar-api/
├── back/                          # API Spring Boot (Java)
│   ├── src/main/java/...          # código-fonte
│   ├── src/main/resources/
│   │   └── application.properties # config + conexão com PostgreSQL
│   └── pom.xml                    # dependências (ou build.gradle)
├── front/                         # Aplicativo mobile (React Native)
├── schema.sql                     # modelo de dados (referência)
└── docs/                          # documentação (.md)
```

## 5.4 Escopo funcional do MVP

### Dentro do escopo (prototipar agora)

| Funcionalidade | Endpoint(s) sugerido(s) |
|---|---|
| Autenticação de usuários | `POST /auth/login`, `POST /auth/register` |
| Cadastro/leitura de clientes | `GET/POST/PUT/DELETE /clientes` |
| Cadastro/leitura de imóveis | `GET/POST/PUT/DELETE /imoveis` |
| Cadastro/leitura de vistoriadores | `GET/POST/PUT/DELETE /vistoriadores` |
| Listagem de OS | `GET /ordens-servico` |
| Health check da API | `GET /health` |

> Foco em **cadastros simples** (RF05, RF06, RF07) + **autenticação** (RF22/RF20), que são rápidos de mostrar e comprovam a integração **Spring Boot ↔ PostgreSQL ↔ mobile**.

### Fora do escopo (implementações futuras)

- Leitura/interpretação automática de e-mails (RF01, RF02, RF03);
- Agendamento automático de vistorias (RF08, RF09);
- Registro completo de vistorias e fotos (RF10, RF11);
- Identificação de modelos de planilha e preenchimento automático (RF12, RF13, RF14);
- Pesquisa de mercado e amostras (RF15, RF16);
- Geração de laudos e versões (RF17, RF18);
- Entrega e download de documentos (RF19);
- Histórico de movimentações (RF21).

## 5.5 Modelo de dados do MVP

Partir de um subconjunto do [`schema.sql`](../schema.sql), criando apenas as tabelas necessárias para o protótipo:

- `usuario` (ou reutilizar `pessoa` + credenciais) — para autenticação;
- `cliente`;
- `imovel`;
- `vistoriador`;
- `ordem_servico` (listagem básica).

O modelo completo fica como referência para as próximas etapas.

## 5.6 Próximos passos sugeridos

1. **Inicializar o repositório Git** e criar a estrutura `back/` + `front/`;
2. **Gerar o projeto Spring Boot** (via Spring Initializr) com dependências: Web, Data JPA, Security, PostgreSQL, Validation;
3. Configurar a **conexão com o PostgreSQL** (`application.properties`);
4. Implementar **autenticação** (decidir JWT vs OAuth);
5. Criar os **endpoints de cadastro** (CRUD) e o health check;
6. Testar com o **mobile** consumindo os endpoints;
7. Preparar a **apresentação**: demo das funcionalidades + roteiro das implementações futuras.
