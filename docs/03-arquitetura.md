# 3. Arquitetura do Sistema

## 3.1 Visão geral

A arquitetura segue um **modelo distribuído baseado em serviços**:

- **Aplicação mobile** (React Native) — interação com o usuário;
- **API central** — processamento das regras de negócio;
- **Banco de dados PostgreSQL** — persistência das informações.

Todo o ambiente é hospedado em **nuvem**, garantindo alta disponibilidade, escalabilidade e acesso remoto. A separação em camadas permite que cada uma evolua de forma independente, facilitando futuras integrações com novos clientes, formatos de planilha e automações baseadas em IA.

### Fluxo operacional

1. Monitoramento das caixas de e-mail cadastradas (recebimento de OS);
2. Leitura e interpretação das mensagens → registro no banco e criação dos registros da vistoria;
3. Contato com o cliente e agendamento da vistoria;
4. Coleta dos dados em campo (via aplicação mobile);
5. Processamento pela API: validações, identificação do modelo de planilha e preenchimento automático;
6. Pesquisa em fontes externas para amostras de imóveis comparáveis;
7. Geração, armazenamento em nuvem e entrega dos laudos aos clientes.

---

## 3.2 Componentes

| Componente | Responsabilidade |
|---|---|
| **Front-end (mobile)** | Gerenciamento de OS, acompanhamento de vistorias, consulta de imóveis, registro de dados em campo, envio de fotos, visualização de documentos e acesso dos usuários. |
| **Back-end (API REST)** | Núcleo da aplicação: regras de negócio, autenticação e autorização, gerenciamento de OS, controle de vistorias, geração de laudos e integração com serviços externos. Disponibiliza os dados consumidos pelo mobile. |
| **Módulo de processamento de e-mails** | Monitora contas de e-mail, lê mensagens, identifica OS, extrai informações e encaminha para processamento pela API. |
| **Módulo de IA** | Classificação de e-mails, identificação de padrões de documentos, reconhecimento de modelos de planilha e auxílio no preenchimento automático de laudos. |
| **Módulo de pesquisa de mercado** | Coleta dados de imóveis em fontes externas (amostras para avaliações e laudos). |
| **Banco de dados (PostgreSQL)** | Armazenamento estruturado: clientes, imóveis, OS, usuários, vistoriadores, vistorias, laudos, amostras, históricos e documentos. |
| **Armazenamento em nuvem** | Guarda de fotos de vistoria, anexos de e-mail, planilhas, relatórios e versões de laudos. |

---

## 3.3 Segurança

*(seção presente na estrutura do documento de origem)*

- Autenticação e autorização de usuários (JWT/OAuth — a decidir no MVP);
- Comunicação segura via HTTPS;
- Controle de níveis de acesso (RF20);
- Logs de auditoria (RNF11);
- Backups periódicos (RNF12);
- Armazenamento seguro de documentos e imagens em nuvem (RNF07).

---

## 3.4 Escalabilidade e manutenção

*(seção presente na estrutura do documento de origem)*

- Arquitetura escalável (RNF10);
- Separação de camadas para evolução independente;
- Suporte a múltiplos usuários simultâneos (RNF08);
- Versionamento de código com Git (RNF13).

---

## 3.5 Diagrama de arquitetura

*(diagrama presente no documento de origem — a incluir como imagem)*

Referência visual dos componentes e fluxo: ver protótipo no Figma:
https://www.figma.com/design/j3yV6aGxbCEVVzCnJ04nU0/Avalliar---Projeto
