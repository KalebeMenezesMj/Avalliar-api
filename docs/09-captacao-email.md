# 09 — Captação de OS por e-mail (Gmail)

A API lê uma caixa do Gmail e, para cada e-mail novo que uma **regra de captação** reconhece, cria a Ordem de Serviço (demanda) do cliente da regra. Código em `back/src/main/java/com/avalliar/api/captacao`.

## Fluxo

1. A cada `GMAIL_INTERVALO_MS` (padrão 60 s), se `GMAIL_MONITORAR=true`, a API lista as mensagens da busca `GMAIL_BUSCA` (padrão `in:inbox newer_than:7d`).
2. Cada mensagem ainda não vista (pelo id do Gmail, em `email_recebido.message_id`) é gravada em `email_recebido` com remetente, assunto e corpo em texto.
3. A primeira regra **vigente** (por id) cujos critérios casam com o remetente e o assunto define o cliente.
4. O número da OS vem do assunto ou do corpo ("OS 12345", "O.S. nº 2026/0042", "Ordem de Serviço: AB-778"); sem número, vira `EMAIL-<id>`.
5. Cria `ordem_servico` com status `RECEBIDA`, `recebida_em` = chegada do e-mail, `prazo_entrega` = chegada + SLA do cliente, `email_recebido_id` preenchido, e um `evento_os` registrando a origem.

`email_recebido.status_processamento`:

| Status | Significado |
|---|---|
| `OS_CRIADA` | OS criada |
| `SEM_REGRA` | Nenhuma regra casou (newsletter, e-mail de cliente sem regra). Reavaliado quando uma regra é criada ou alterada. |
| `OS_DUPLICADA` | Já existe OS do mesmo cliente com o mesmo número (ex.: reenvio) |

E-mail que falha no processamento não é gravado e é tentado de novo no próximo ciclo.

## Endpoints

| Método | Caminho | Uso |
|---|---|---|
| `GET/POST` | `/api/regras-captacao` | Listar / criar regra |
| `PUT/DELETE` | `/api/regras-captacao/{id}` | Alterar (incrementa `versao`) / excluir |
| `POST` | `/api/emails/sincronizar` | Ler a caixa agora (mesmo com o monitoramento desligado) |
| `GET` | `/api/emails` | Últimos 100 e-mails e o status de cada um |

Regra: critérios são **expressões regulares** sem diferenciar maiúsculas; ao menos um é obrigatório.

```json
{ "clienteId": 7, "criterioRemetente": "@caixa\\.gov\\.br", "criterioAssunto": "\\bOS\\b|ordem de servi[çc]o", "vigenteDe": "2026-11-14" }
```

## Configurar o Gmail (uma vez, feito pelo dono da caixa)

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto e ative a **Gmail API**.
2. **Tela de consentimento OAuth**: tipo *Externo*, adicione o e-mail da caixa como usuário de teste e **publique o app (Em produção)**. Em modo *Teste*, o refresh token expira em 7 dias.
3. **Credenciais → ID do cliente OAuth → Aplicativo da Web**, com o URI de redirecionamento `https://developers.google.com/oauthplayground`. Anote o client id e o secret.
4. No [OAuth Playground](https://developers.google.com/oauthplayground), na engrenagem, marque *Use your own OAuth credentials* e informe o id e o secret. Autorize o escopo `https://www.googleapis.com/auth/gmail.readonly` entrando com a conta da caixa e troque o código por tokens. Copie o **refresh token**.

A API só **lê** a caixa (escopo `gmail.readonly`); não marca nem move mensagens.

## Variáveis de ambiente

| Variável | Padrão | |
|---|---|---|
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | — | Obrigatórias para a captação |
| `GMAIL_MONITORAR` | `false` | `true` liga a leitura periódica |
| `GMAIL_INTERVALO_MS` | `60000` | Intervalo entre leituras |
| `GMAIL_BUSCA` | `in:inbox newer_than:7d` | Busca do Gmail (mesma sintaxe da caixa de pesquisa) |
| `GMAIL_MAXIMO_POR_CICLO` | `50` | Mensagens lidas por ciclo |
| `GMAIL_API_URL`, `GMAIL_TOKEN_URL` | URLs do Google | Só para testes com servidor falso |

Na Azure, como secrets do Container App (nunca no repositório):

```bash
az containerapp secret set -n avalliar-api -g rg-avalliar --secrets gmail-client-secret=<secret> gmail-refresh-token=<token>
az containerapp update -n avalliar-api -g rg-avalliar --set-env-vars GMAIL_CLIENT_ID=<id> GMAIL_CLIENT_SECRET=secretref:gmail-client-secret GMAIL_REFRESH_TOKEN=secretref:gmail-refresh-token GMAIL_MONITORAR=true
```

Com mais de uma réplica da API, cada uma lê a caixa; o `message_id` único impede e-mail duplicado, mas mantenha 1 réplica ou desligue `GMAIL_MONITORAR` nas demais.

## Banco

O Hibernate (`ddl-auto: update`) cria `conta_email`, `email_recebido`, `regra_captacao` e a coluna `ordem_servico.email_recebido_id`. Diferença em relação ao `schema.sql`: a regra ainda não tem `tipo_laudo_id` (não há entidade de tipo de laudo na API).

## Testes

- `CaptacaoRegrasTest`: extração do número da OS, critérios e vigência das regras.
- Ponta a ponta (14/11/2026) com Postgres local e um servidor falso da Gmail API: 3 e-mails → 1 OS criada (número `2026/0042`, prazo = SLA de 72 h), 1 reenvio `OS_DUPLICADA`, 1 newsletter `SEM_REGRA`; segunda leitura não duplica; cadastrar a regra depois reaproveitou os e-mails `SEM_REGRA`.

## Ainda não feito

- Anexos (`email_anexo`) e extração de campos (`extracao_campo`) via ML.
- `email_classificacao` (classificação automática/humana).
- Tela de regras e de e-mails no app.
