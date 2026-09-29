# Avalliar — API

Sistema multiplataforma para automação do processo de **vistoria e avaliação imobiliária** da empresa **Avalliar**.

Este repositório corresponde ao **back-end (API)** do projeto. Ele é a fonte de dados consumida pelo aplicativo mobile (React Native) e centraliza as regras de negócio.

---

## O que é o Avalliar?

O Avalliar automatiza o fluxo operacional de avaliação imobiliária:

1. **Recebe** Ordens de Serviço (OS) por e-mail;
2. **Interpreta** e extrai as informações relevantes;
3. **Agenda** vistorias com os clientes;
4. **Coleta** os dados dos engenheiros/vistoriadores em campo;
5. **Preenche** automaticamente planilhas técnicas (identificando o modelo de cada cliente via Machine Learning);
6. **Pesquisa** anúncios imobiliários para obter amostras comparáveis;
7. **Gera** e entrega laudos de avaliação.

> Documentação acadêmica completa de origem: [`Avalliar - Documentação.docx`](Avalliar%20-%20Documentação.docx)
> Modelo de dados completo: [`schema.sql`](schema.sql)

---

## Escopo do MVP (decisão da equipe)

Para a apresentação, o MVP da API entrega apenas as funcionalidades **mais simples e apresentáveis**:

| # | Funcionalidade | Descrição |
|---|---|---|
| 1 | **Autenticação** | Login seguro de usuários (JWT) |
| 2 | **Comunicação com o banco** | Persistência e leitura de dados no PostgreSQL |
| 3 | **Disponibilidade de dados para o mobile** | Endpoints REST que o app consome |

**Estratégia:** apresentar o protótipo com essas funcionalidades e, em seguida, falar das implementações futuras.

**Stack:** Java + **Spring Boot**, PostgreSQL, API REST padrão.

**Estrutura:** monorepo com diretórios separados (padrão do PG360):

```
Avalliar-api/
├── back/     # API Spring Boot (Java)
└── front/    # Aplicativo mobile (React Native)
```

Detalhes completos: [`docs/05-mvp.md`](docs/05-mvp.md)

---

## Índice da documentação

| Documento | Conteúdo |
|---|---|
| [01-visao-do-projeto.md](docs/01-visao-do-projeto.md) | Tema, objetivos, problematização, justificativa, usuários e stakeholders |
| [02-requisitos.md](docs/02-requisitos.md) | Requisitos funcionais (RF) e não funcionais (RNF) |
| [03-arquitetura.md](docs/03-arquitetura.md) | Arquitetura, componentes, segurança e escalabilidade |
| [04-modelo-de-dados.md](docs/04-modelo-de-dados.md) | Modelo de dados PostgreSQL (domínios e relacionamentos) |
| [05-mvp.md](docs/05-mvp.md) | Escopo e planejamento do MVP da API |

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

## Stack (visão do projeto completo)

| Camada | Tecnologia |
|---|---|
| Mobile | React Native |
| Back-end | API REST (Spring Boot — Java) |
| Banco de dados | PostgreSQL |
| Hospedagem | Microsoft Azure (nuvem) |
| Inteligência Artificial | Classificação de e-mails, reconhecimento de modelos de planilha, ML |
| Versionamento | Git |
