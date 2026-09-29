# 4. Modelo de Dados

Fonte: [`schema.sql`](../schema.sql) — schema **PostgreSQL** derivado do modelo conceitual do projeto.

## 4.1 Convenções adotadas

- `numeric` para decimais, `text` para strings e `timestamptz` para datas/horas;
- `pessoa` é usada tanto para `usuario_id` quanto para `avaliador_id` (o modelo não tem tabela separada de usuário/avaliador);
- Referências circulares (`template_planilha ↔ cliente_tipo_laudo` e `email_classificacao ↔ ordem_servico`) são adicionadas após a criação das duas tabelas (`ALTER TABLE ... ADD CONSTRAINT`).

---

## 4.2 Domínios e tabelas

### Cadastros / entidades-base

| Tabela | Descrição |
|---|---|
| `cliente` | Empresas contratantes (CNPJ, razão social, SLA padrão, janela de contato) |
| `pessoa` | Pessoas físicas (contatos, usuários e avaliadores) |
| `vistoriador` | Profissionais de vistoria (registro, base geográfica, capacidade diária) |
| `tipologia` | Tipos de imóvel (ex.: apartamento, casa) |
| `imovel` | Imóveis vistoriados (endereço, geolocalização, características) |
| `imovel_atributo` | Atributos canônicos do imóvel (chave/valor) |

### Campos e templates

| Tabela | Descrição |
|---|---|
| `campo_canonico` | Campos normalizados usados em todo o sistema |
| `tipo_laudo` | Tipos de laudo (exige vistoria? pesquisa amostral?) |
| `cliente_tipo_laudo` | Configuração cliente × tipo de laudo (SLA, amostras, raio) |
| `template_planilha` | Versões de modelos de planilha por cliente/tipo |
| `template_campo` | Mapeamento campo canônico → destino no template do cliente |
| `regra_negocio_cliente` | Regras de negócio (bloqueio/alerta) por cliente/tipo |

### E-mail e captação

| Tabela | Descrição |
|---|---|
| `conta_email` | Caixas de e-mail monitoradas |
| `email_recebido` | Mensagens recebidas |
| `email_anexo` | Anexos das mensagens (com texto extraído) |
| `regra_captacao` | Regras de captação por cliente/tipo (versões e vigência) |
| `regra_campo` | Extração de campos por regra (corpo/assunto/anexo) |
| `email_classificacao` | Classificação do e-mail (auto/humano) e vínculo com a OS |
| `extracao_campo` | Valores extraídos (bruto/normalizado) e correções do usuário |

### Ordem de serviço

| Tabela | Descrição |
|---|---|
| `ordem_servico` | OS (número do cliente, cliente, tipo, e-mail, imóvel, prazos, status) |
| `evento_os` | Histórico de mudanças de status |
| `os_pessoa` | Pessoas relacionadas à OS (papel, principal para contato) |

### Vistoria

| Tabela | Descrição |
|---|---|
| `agenda_disponibilidade` | Disponibilidade dos vistoriadores |
| `vistoriador_regiao` | Regiões de atuação dos vistoriadores |
| `vistoria` | Vistorias (agendamento, status, realização) |
| `tentativa_contato` | Tentativas de contato para agendamento |
| `vistoria_foto` | Fotografias da vistoria |

### Pesquisa de mercado

| Tabela | Descrição |
|---|---|
| `fonte_pesquisa` | Fontes de dados (oferta/transação, confiabilidade) |
| `coleta` | Execuções de coleta (robô/manual, totais) |
| `amostra` | Amostras imobiliárias coletadas |
| `amostra_atributo` | Atributos das amostras |

### Laudo e entrega

| Tabela | Descrição |
|---|---|
| `laudo` | Laudos de avaliação (valores, metodologia, status) |
| `laudo_amostra` | Amostras usadas no laudo (fatores de homogeneização) |
| `laudo_versao` | Versões dos laudos (snapshot JSON) |
| `laudo_arquivo` | Arquivos gerados (planilha/pdf/ART) com hash |
| `laudo_validacao` | Resultado das regras de negócio aplicadas ao laudo |
| `entrega` | Entregas aos clientes (email/portal/api, protocolo, status) |

---

## 4.3 Relacionamentos principais

```
conta_email 1─n email_recebido 1─n email_anexo
email_recebido 1─1 email_classificacao n─1 regra_captacao
regra_captacao n─1 cliente ; n─1 tipo_laudo
regra_captacao 1─n regra_campo n─1 campo_canonico

cliente 1─n cliente_tipo_laudo n─1 tipo_laudo
cliente_tipo_laudo 1─n template_planilha 1─n template_campo n─1 campo_canonico
cliente_tipo_laudo 1─n regra_negocio_cliente

cliente 1─n ordem_servico n─1 tipo_laudo
ordem_servico n─1 imovel ; n─1 email_recebido
ordem_servico 1─n evento_os ; 1─n os_pessoa n─1 pessoa

ordem_servico 1─n vistoria n─1 vistoriador
vistoria 1─n tentativa_contato ; 1─n vistoria_foto

fonte_pesquisa 1─n coleta ; fonte_pesquisa 1─n amostra
coleta 1─n amostra 1─n amostra_atributo n─1 campo_canonico

ordem_servico 1─n laudo n─1 vistoria ; n─1 avaliador(pessoa) ; n─1 template_planilha
laudo 1─n laudo_amostra n─1 amostra
laudo 1─n laudo_versao 1─n laudo_arquivo
laudo 1─n laudo_validacao n─1 regra_negocio_cliente
laudo_versao 1─n entrega
```

---

## 4.4 Observações para o MVP

O schema completo cobre o produto final. Para o **MVP da API**, o foco é um subconjunto mínimo (cadastros + autenticação + leitura de dados), sem necessariamente criar todas as tabelas de imediato. O modelo completo serve como referência de evolução — ver [`05-mvp.md`](05-mvp.md).
