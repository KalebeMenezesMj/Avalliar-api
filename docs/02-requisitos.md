# 2. Requisitos

## 2.1 Requisitos Funcionais (RF)

| ID | Requisito |
|---|---|
| RF01 | O sistema deve realizar a leitura automática de e-mails contendo Ordens de Serviço (OS). |
| RF02 | O sistema deve identificar e extrair informações relevantes das Ordens de Serviço recebidas. |
| RF03 | O sistema deve cadastrar automaticamente as Ordens de Serviço no banco de dados. |
| RF04 | O sistema deve permitir o gerenciamento e acompanhamento das Ordens de Serviço. |
| RF05 | O sistema deve permitir o cadastro e gerenciamento de clientes. |
| RF06 | O sistema deve permitir o cadastro e gerenciamento de imóveis. |
| RF07 | O sistema deve permitir o cadastro e gerenciamento de vistoriadores. |
| RF08 | O sistema deve auxiliar no agendamento de vistorias com clientes. |
| RF09 | O sistema deve registrar tentativas de contato realizadas para agendamento. |
| RF10 | O sistema deve permitir o registro das informações coletadas durante as vistorias. |
| RF11 | O sistema deve permitir o envio e armazenamento de fotografias dos imóveis vistoriados. |
| RF12 | O sistema deve identificar automaticamente o modelo de planilha correspondente a cada cliente. |
| RF13 | O sistema deve preencher automaticamente planilhas e documentos usando os dados das vistorias. |
| RF14 | O sistema deve usar Machine Learning para reconhecer diferentes padrões de planilhas e laudos. |
| RF15 | O sistema deve realizar pesquisas em fontes externas para obter dados de imóveis comparáveis. |
| RF16 | O sistema deve armazenar e gerenciar amostras imobiliárias usadas nas avaliações. |
| RF17 | O sistema deve gerar laudos de avaliação imobiliária. |
| RF18 | O sistema deve armazenar versões dos laudos gerados. |
| RF19 | O sistema deve permitir a consulta e download de planilhas, documentos e laudos. |
| RF20 | O sistema deve controlar diferentes níveis de acesso de usuários. |
| RF21 | O sistema deve registrar o histórico de alterações e movimentações das Ordens de Serviço. |
| RF22 | O sistema deve permitir autenticação segura dos usuários. |

---

## 2.2 Requisitos Não Funcionais (RNF)

| ID | Requisito |
|---|---|
| RNF01 | Desenvolvido com **React Native**. |
| RNF02 | Utilizar **API REST** para integração entre os componentes. |
| RNF03 | Utilizar **PostgreSQL** como banco de dados relacional. |
| RNF04 | Hospedado em infraestrutura de nuvem **Microsoft Azure**. |
| RNF05 | Comunicação segura via **HTTPS**. |
| RNF06 | Autenticação e controle de acesso dos usuários. |
| RNF07 | Armazenamento de documentos e imagens em ambiente seguro de nuvem. |
| RNF08 | Suportar múltiplos usuários simultâneos sem degradação significativa de desempenho. |
| RNF09 | Tempo médio de resposta da API **≤ 3 segundos**. |
| RNF10 | Arquitetura escalável para suportar o crescimento futuro. |
| RNF11 | Manter **logs de auditoria** para rastreamento das operações. |
| RNF12 | Realizar **backups periódicos** das informações. |
| RNF13 | Código-fonte versionado com **Git**. |
| RNF14 | Compatível com dispositivos **Android** modernos. |
| RNF15 | Garantir integridade, consistência e disponibilidade dos dados. |

---

## 2.3 Relevância para o MVP da API

O MVP cobre diretamente os requisitos **RF05/06/07 (cadastros)**, **RF20/RF22 (autenticação e controle de acesso)** e a base de **RNF02/RNF03 (REST + PostgreSQL)**. Os demais requisitos (processamento de e-mail, ML, pesquisa de mercado, geração de laudos) ficam para as implementações futuras — ver [`05-mvp.md`](05-mvp.md).
