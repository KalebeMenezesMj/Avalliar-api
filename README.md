# Avalliar — API

Sistema multiplataforma para automação do processo de **vistoria e avaliação imobiliária** da empresa **Avalliar**.

Este repositório é o **monorepo** do projeto:

```
Avalliar-api/
├── back/     # API Spring Boot (Java 21)
├── front/    # Aplicativo React Native / Expo (mobile e web)
├── ml/       # Serviço de Machine Learning (FastAPI) — ver docs/06
└── docs/     # Documentação técnica
```

---

## O que é o Avalliar?

O Avalliar automatiza o fluxo operacional de avaliação imobiliária:

1. **Recebe** Ordens de Serviço (OS) por e-mail (captação via Gmail);
2. **Cadastra** clientes e acompanha as OS e seus prazos;
3. **Coleta** as fotos da vistoria, organizadas por cômodo;
4. **Preenche** planilhas técnicas (V22/V25) a partir dos dados da vistoria;
5. **Pesquisa** anúncios imobiliários para obter amostras comparáveis;
6. **Calcula** o CUB de São Paulo e o usa no laudo;
7. **Gera** os laudos de avaliação.

> Modelo de dados completo: [`schema.sql`](schema.sql)

---

## Estado atual

### Back-end (`back/`)

| Área | O que existe |
|---|---|
| Autenticação | Cadastro e login com JWT (`/api/auth/register`, `/api/auth/login`) |
| Clientes e OS | CRUD de clientes e de ordens de serviço, com prazo (SLA) e histórico de eventos |
| Captação por e-mail | Lê a caixa do Gmail (OAuth, escopo somente leitura), aplica regras por remetente e assunto e cria a OS automaticamente |
| CUB | Índice mensal por UF e variante (com ou sem desoneração), injetado automaticamente nos pedidos de laudo de SP |
| Fotos da vistoria | Upload por cômodo, ordenação automática, finalização e entrega ao ML. Armazenamento no Azure Files. Todas as rotas exigem token |
| Laudos | Repasse dos pedidos de preenchimento de planilha ao serviço de ML |

### Front-end (`front/`)

- Telas de empresas, demandas e detalhe da demanda.
- Lista de clientes e OS carregada do banco. Se o servidor não responder, usa dados de exemplo.
- Preenchimento de planilhas V22/V25 pelo ML, com download e visualização do arquivo.

### Machine Learning (`ml/`)

Reconhecimento e preenchimento das planilhas. Detalhes em [`docs/06-ml-preenchimento-planilhas.md`](docs/06-ml-preenchimento-planilhas.md).

---

## Endpoints principais

| Método | Caminho | Uso | Autenticação |
|---|---|---|---|
| POST | `/api/auth/login` | Login, devolve o token JWT | Não |
| GET | `/api/clientes` | Lista clientes | Não |
| GET | `/api/ordens-servico` | Lista ordens de serviço | Não |
| GET | `/api/cub?uf=SP` | Último CUB lançado | Não |
| POST | `/api/cub` | Lança o CUB de um mês | Não |
| POST | `/api/laudos/preencher` | Preenche a planilha pelo template | Não |
| POST | `/api/vistorias/{id}/fotos` | Envia uma foto da vistoria | **Sim** |
| GET | `/api/vistorias/{id}/fotos` | Lista as fotos da vistoria | **Sim** |
| POST | `/api/vistorias/{id}/fotos/finalizar` | Finaliza o relatório fotográfico | **Sim** |

A documentação interativa (Swagger) fica em `/swagger-ui.html` do back.

Para as rotas de fotos, envie o cabeçalho `Authorization: Bearer <token>`. Sem ele, a API responde 403.

---

## Como rodar localmente

### Back-end

Pré-requisitos: Java 21 e Maven. As variáveis de banco e de integração são lidas do ambiente (veja a seção seguinte).

```bash
cd back
mvn spring-boot:run
```

Testes:

```bash
cd back
mvn test
```

### Front-end

Pré-requisitos: Node.js LTS.

```bash
cd front
npm install
npx expo start
```

Use `npx expo start --web` para abrir no navegador, ou leia o QR code no app Expo Go.

---

## Configuração

Nenhum valor real vai para o repositório. As variáveis abaixo são lidas do ambiente.

| Variável | Para que serve |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE` | Banco PostgreSQL |
| `JWT_SECRET`, `JWT_EXPIRATION_MS` | Assinatura e validade do token |
| `ML_URL` | Endereço do serviço de ML |
| `FOTOS_AZURE_CONNECTION_STRING`, `FOTOS_AZURE_SHARE` | Armazenamento das fotos (vazio = pasta local) |
| `FOTOS_DIRETORIO` | Pasta local das fotos quando não há Azure Files |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Captação de OS por e-mail (sem elas, a captação fica desligada) |
| `GMAIL_MONITORAR` | Liga a leitura periódica da caixa de entrada |

Em produção, os segredos ficam como *secrets* do Azure Container Apps.

---

## Deploy

Produção na **Microsoft Azure** (Container Apps, região Central US):

- `avalliar-api`: back-end Spring Boot
- `avalliar-ml`: serviço de ML
- Banco PostgreSQL gerenciado
- Conta de armazenamento com o compartilhamento de fotos

Detalhes e comandos: [`docs/07-deploy-azure.md`](docs/07-deploy-azure.md).

---

## Índice da documentação

| Documento | Conteúdo |
|---|---|
| [01-visao-do-projeto.md](docs/01-visao-do-projeto.md) | Tema, objetivos, problematização, justificativa, usuários e stakeholders |
| [02-requisitos.md](docs/02-requisitos.md) | Requisitos funcionais (RF) e não funcionais (RNF) |
| [03-arquitetura.md](docs/03-arquitetura.md) | Arquitetura, componentes, segurança e escalabilidade |
| [04-modelo-de-dados.md](docs/04-modelo-de-dados.md) | Modelo de dados PostgreSQL (domínios e relacionamentos) |
| [05-mvp.md](docs/05-mvp.md) | Escopo e planejamento do MVP da API |
| [06-ml-preenchimento-planilhas.md](docs/06-ml-preenchimento-planilhas.md) | ML: reconhecimento e preenchimento das planilhas V22/V25 |
| [07-deploy-azure.md](docs/07-deploy-azure.md) | Infraestrutura e deploy na Azure |
| [08-guia-do-desenvolvedor.md](docs/08-guia-do-desenvolvedor.md) | Estrutura, execução local, testes e convenções |
| [09-captacao-email.md](docs/09-captacao-email.md) | Captação de OS por e-mail (Gmail API + regras de captação) |
| [checkpoint.md](checkpoint.md) | Estado atual e pendências |

---

## Equipe

- Gustavo Lemos
- Kalebe Menezes
- Lucas Neves
- Nicolas Rodrigues

**Curso:** Tecnologia de Desenvolvimento de Software Multiplataforma — FATEC Praia Grande
**Disciplina:** Laboratório de Desenvolvimento Mobile (5º Módulo)
**Orientador:** Prof. Alessandro Ferreira Paz Lima

**Protótipo no Figma:** https://www.figma.com/design/j3yV6aGxbCEVVzCnJ04nU0/Avalliar---Projeto

---

## Stack

| Camada | Tecnologia |
|---|---|
| Mobile / web | React Native + Expo |
| Back-end | Spring Boot 3.5 (Java 21), JPA, JWT |
| Banco de dados | PostgreSQL |
| ML | FastAPI (Python) |
| Hospedagem | Microsoft Azure (Container Apps, Azure Files, PostgreSQL) |
| Versionamento | Git |
