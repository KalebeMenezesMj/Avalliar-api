# 1. Visão do Projeto

## 1.1 Tema

Desenvolvimento de um **sistema multiplataforma** (com foco em dispositivos móveis, React Native) destinado à **automação do processo de vistoria imobiliária** da empresa **Avalliar**.

O sistema é responsável por:

- Receber e processar **Ordens de Serviço (OS)** enviadas por e-mail;
- Realizar o **agendamento automático** de vistorias com clientes;
- Coletar os dados fornecidos pelos engenheiros após as inspeções;
- **Preencher planilhas técnicas** de forma automatizada;
- Utilizar **aprendizado de máquina** para identificar diferentes modelos de planilhas exigidos por empresas contratantes e preencher corretamente os campos de cada padrão;
- Realizar **pesquisas em plataformas de anúncios imobiliários** para obter dados amostrais usados na composição de relatórios e avaliações.

---

## 1.2 Objetivos

### 1.2.1 Objetivo geral

Desenvolver um sistema mobile inteligente para **automatizar o fluxo operacional da Avalliar** — do recebimento das ordens de serviço até a geração e preenchimento automático de planilhas de vistoria e avaliação imobiliária — usando integração com e-mails, automação de processos e recursos de aprendizado de máquina, e implantá-lo em **hospedagem em nuvem**.

### 1.2.2 Objetivos específicos

*(seção presente na estrutura do documento de origem; detalhes a complementar)*

- Automatizar a leitura e interpretação de e-mails de OS;
- Automatizar o agendamento e o acompanhamento de vistorias;
- Automatizar o preenchimento de planilhas conforme o modelo de cada cliente;
- Coletar dados de mercado para composição das avaliações;
- Disponibilizar os dados de forma centralizada para o mobile via API.

---

## 1.3 Problematização

Grande parte do processo de vistoria e avaliação imobiliária é hoje **manual**: profissionais analisam e-mails, organizam ordens de serviço, fazem agendamentos, processam informações das visitas técnicas e preenchem planilhas com padrões distintos. Isso:

- Consome tempo;
- Aumenta custos operacionais;
- Está sujeito a **falhas humanas**.

Outro desafio é a **coleta de dados de mercado** para compor avaliações, que geralmente envolve pesquisas manuais em anúncios e múltiplas fontes, tornando o trabalho ainda mais demorado.

A solução deve **automatizar essas atividades**, garantindo eficiência operacional, padronização e redução do tempo de elaboração dos relatórios.

---

## 1.4 Justificativa

A criação do Avalliar se justifica pela necessidade de **modernizar e automatizar** processos fundamentais da vistoria e avaliação imobiliária:

- Redução significativa do esforço manual dos colaboradores;
- Maior agilidade na execução das atividades;
- Melhoria da qualidade das informações geradas;
- Aumento da produtividade da equipe técnica;
- Redução de erros e maior padronização dos documentos;
- Melhor experiência para clientes e parceiros (bancos, financeiras e empresas contratantes).

---

## 1.5 Usuários e stakeholders

### Usuários

| Perfil | Responsabilidades |
|---|---|
| **Assistentes Operacionais** | Acompanhar as OS recebidas, agendar vistorias e monitorar o andamento dos processos |
| **Vistoriadores** | Registrar informações das visitas técnicas, enviar fotografias e atualizar o status das vistorias |
| **Avaliadores** | Analisar informações coletadas, validar dados e elaborar os laudos imobiliários |
| **Gestores** | Acompanhar operações, controlar produtividade e tomar decisões estratégicas |

### Stakeholders

| Stakeholder | Interesse |
|---|---|
| **Avalliar** | Automatizar processos, reduzir custos e aumentar produtividade |
| **Funcionários da Avalliar** | Usuários diretos do sistema |
| **Clientes** (bancos, financeiras, empresas contratantes) | Agilidade, padronização e qualidade dos laudos |
| **Equipe de Desenvolvimento** | Implementação, manutenção e evolução da solução |
| **Instituição de Ensino / Orientador** | Sucesso acadêmico e técnico do projeto |
