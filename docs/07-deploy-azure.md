# 07 — Deploy e infraestrutura (Azure)

## Recursos

| Recurso | Nome |
|---|---|
| Resource group | `rg-avalliar` |
| Container App (ML) | `avalliar-ml` — imagem `nicolassilvar/avalliar-ml:v22` |
| Container App (API Java) | `avalliar-api` — imagem `nicolassilvar/avalliar-api:v3` |
| Dimensão ML | 1 vCPU / 2 GiB, mínimo 1 réplica |
| Storage | `avalliarstorageml`, container privado `templates` |
| URL ML | `https://avalliar-ml.politefield-70f0caa0.centralus.azurecontainerapps.io` |
| URL API | `https://avalliar-api.politefield-70f0caa0.centralus.azurecontainerapps.io` |

## Como o ML sobe

1. A imagem Docker **não** contém templates de cliente nem modelos pesados (`data/` fora da imagem).
2. No startup, `app.py` baixa do Blob (via `TEMPLATES_BLOB`, URL com SAS) os templates e os
   artefatos `idade_model.joblib` e `campos_amostra.joblib`.
3. Treina o reconhecedor e o mapeador a partir do PostgreSQL (schema `ml_data`) ou dos exemplos locais.

## Publicar uma nova versão

```bash
# ML
docker build -t nicolassilvar/avalliar-ml:vN ml
docker push nicolassilvar/avalliar-ml:vN
az containerapp update -n avalliar-ml -g rg-avalliar --image nicolassilvar/avalliar-ml:vN
# API Java: idem em back/ com avalliar-api
```

Notas:
- **Use sempre uma tag nova.** A Azure guarda em cache o erro "image not found" de tags já tentadas (ocorreu com `v5`).
- No ambiente Express não há restart de revisão; trocar a imagem cria nova revisão.
- Login: `az login --use-device-code`.
- Spring: upload multipart limitado a 30 MB (`application.yml`); o padrão de 1 MB causava 502.

## Subir um artefato para o Blob

Requer a função *Storage Blob Data Contributor*:

```bash
az storage blob upload --account-name avalliarstorageml --container-name templates \
  --name campos_amostra.joblib --file ml/models/campos_amostra.joblib --auth-mode login --overwrite
```

## Variáveis de ambiente relevantes

`DB_*` (PostgreSQL), `TEMPLATES_BLOB` (SAS), `RETRAIN_TOKEN`, e as da API Java (JWT, CORS).
**Nunca versionar senhas ou SAS.** Pendente: mover `DB_PASSWORD` para secret, desligar Swagger em produção e rotacionar `RETRAIN_TOKEN`.

## VivaReal em produção (burlar o bloqueio Cloudflare da Azure)

O VivaReal (Cloudflare) responde 403 para IPs de datacenter — a busca do scrapper
(`ml/vivareal.py`) funciona no IP residencial mas não na Container App. O HTML é
buscado por uma **cadeia de fontes**; a primeira que devolver a página de
resultados é usada e o resultado fica em cache em memória por `VIVAREAL_CACHE_TTL`
s (padrão 1800) — repetir a mesma busca não gasta de novo:

| Ordem | Fonte | Env var | Custo / observações |
|---|---|---|---|
| 1 | ScrapingAnt (API de scraping; saída dos servidores deles) | `VIVAREAL_SCRAPIANT` | **grátis**: 10 mil créditos/mês, sem cartão (scrapingant.com). Busca simples = 1 crédito; só tenta com browser (10 créditos) se a simples vier bloqueada. Opcional — não configurado hoje. Alternativa caso a DataImpulse expire. |
| 2 | **Proxies residenciais (DataImpulse cr.br)** — fonte principal em produção | `VIVAREAL_PROXY` (secret `vivareal-proxy`; lista separada por vírgula) | **A solução em produção (v17).** A VPS sai pela rede residencial BR do provedor, sem depender de máquina local. Continua valendo enquanto a conta DataImpulse estiver ativa. |
| 3 | Relay residencial (o fetch sai pela internet da sua máquina) | `VIVAREAL_RELAY` (+ `VIVAREAL_RELAY_KEY`) | grátis; fallback opcional quando o proxy falhar. Sobe com `infra\subir-relay.bat`. **Removido da produção em 15/11** (não dependemos mais do PC) — recrie as duas env vars para reativar. |
| 4 | Direta | — | funciona fora de datacenter (fallback final). |

Sem nenhuma fonte configurada a cadeia degrada para "direta" e devolve o aviso
normal ("VivaReal indisponível") — o preenchimento nunca quebra por isso.

Detalhe importante: o `urllib`/`requests` padrão do Python recebe 403 do
Cloudflare do VivaReal **mesmo saindo de IP residencial** (fingerprint TLS/headers).
Por isso as buscas diretas/proxy usam `curl_cffi` (fingerprint de Chrome real) —
já adicionado ao `requirements.txt`. Sem isso os proxies também davam 403.

### Estado atual (v17, 15/11/2026)

- Deployado: `nicolassilvar/avalliar-ml:v17`; `/diag/vivareal?uf=sp&cidade=Peruíbe`
  → busca OK via **proxy[0] (DataImpulse)** — 100% na VPS, sem PC.
- Env vars de relay removidas da produção (`--remove-env-vars`). O túnel/relay
  locais podem ser desligados; para reusar o relay no futuro, recriar as env vars
  `VIVAREAL_RELAY`/`VIVAREAL_RELAY_KEY` basta (o código continua suportando).
- Armadilha documentada: `az containerapp update --set-env-vars "X=$nome-do-secret"`
  guarda a string literal `$nome-do-secret`, **não** cria um secretRef (verificado
  na v15 — causava 401 no relay). Para secretRef de verdade, editar o template
  YAML. `--remove-env-vars` não aceita lista com vírgula nesta versão do CLI —
  remover um por um.

### Relay residencial (infra\subir-relay.bat)

1. Sobe `infra\relay.py` (porta 8899; só fetcha hosts `*.vivareal.com.br`;
   protegido pela header `X-Avalliar-Key` quando `RELAY_KEY` está definido).
2. Baixa o `cloudflared.exe` na 1ª vez e abre um Cloudflare Quick Tunnel
   gratuito (sem conta), que imprime uma URL `https://xxxx.trycloudflare.com`.
3. Atualize o container app com a URL:

```bash
az containerapp update -n avalliar-ml -g rg-avalliar --set-env-vars \
  "VIVAREAL_RELAY=https://xxxx.trycloudflare.com" "VIVAREAL_RELAY_KEY=<mesma RELAY_KEY>"
```

- **A URL muda a cada restart do PC/tunnel** — nesse dia, rode o `az containerapp
  update` de novo (30 s). Para URL fixa: tunnel nomeado num domínio próprio
  (conta Cloudflare grátis + domínio). Sem o relay, o proxy DataImpulse assume.

### ScrapingAnt (alternativa futura, sem depender da máquina local nem da DataImpulse)

Criar conta gratuita (sem cartão) em scrapingant.com → copiar a API key → setar a
env var `VIVAREAL_SCRAPIANT` na Container App (valor literal, ver armadilha acima).

### Diagnóstico

Local (e dentro da imagem, testando exatamente o que a VPS usa):

```bash
python ml\ferramentas\teste_vivareal.py
# ou: docker run --rm -e VIVAREAL_RELAY=https://... -e VIVAREAL_RELAY_KEY=... \
#        nicolassilvar/avalliar-ml:vN python ferramentas/teste_vivareal.py
```

Em produção (devolve as fontes configuradas, a fonte da última busca e roda uma
busca real quando passa uf/cidade):

```bash
curl "https://avalliar-ml.politefield-70f0caa0.centralus.azurecontainerapps.io/diag/vivareal?uf=sp&cidade=Peru%C3%ADbe&tipo=casa"
# -> {"fontes_configuradas":[...], "ultima_fonte":"relay (...)","busca":{"status":"ok","total_anuncios":30}}
```

## Dados de trabalho locais (fora do repo)

`D:\Avalliar\` contém cópia dos laudos (`laudos_2025`, origem `C:\Users\Kalebe\Desktop\2025`),
scripts de levantamento/validação (`saida\`) e datasets (`ml_data\amostras_v22.json`).
