# 07 — Deploy e infraestrutura (Azure)

## Recursos

| Recurso | Nome |
|---|---|
| Resource group | `rg-avalliar` |
| Container App (ML) | `avalliar-ml` — imagem `nicolassilvar/avalliar-ml:v10` |
| Container App (API Java) | `avalliar-api` — imagem `nicolassilvar/avalliar-api:v3` |
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

## Dados de trabalho locais (fora do repo)

`D:\Avalliar\` contém cópia dos laudos (`laudos_2025`, origem `C:\Users\Kalebe\Desktop\2025`),
scripts de levantamento/validação (`saida\`) e datasets (`ml_data\amostras_v22.json`).
