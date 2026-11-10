# -*- coding: utf-8 -*-
"""Retreino seguro: treina um candidato, compara com o modelo atual e só promove se não piorar.

Fluxo:
    1. lê os exemplos do banco (ml_data) e treina um modelo CANDIDATO numa pasta temporária;
    2. avalia candidato e modelo atual no mesmo conjunto reservado (ml_data.eval_examples);
    3. se a nota do candidato >= a do atual, troca os arquivos de models/ (troca atômica);
    4. registra tudo em models/metricas.json e em ml_data.model_runs.

Usado pelo endpoint POST /retreinar e pode ser rodado direto: `python retreino.py`.
"""
import os
import shutil
import sys
import tempfile
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import avaliar
import train

_lock = threading.Lock()
ARQUIVOS = ("recognizer.joblib", "mapper.joblib")


def executar(forcar=False):
    """Retreina e (se não piorar) promove. Devolve um resumo serializável."""
    if not _lock.acquire(blocking=False):
        return {"ok": False, "motivo": "Já existe um retreino em andamento."}
    try:
        engine = train.get_db_engine()
        exemplos = train.collect_recognizer_examples_from_db()
        if not exemplos:
            return {"ok": False, "motivo": "Sem exemplos no banco (ml_data.recognizer_examples vazia "
                                           "ou banco inacessível). Nada foi alterado."}

        cand_dir = tempfile.mkdtemp(prefix="cand_")
        try:
            train.treinar(cand_dir)
            cand = avaliar.avaliar_diretorio(cand_dir, engine)

            atual = None
            if all(os.path.exists(os.path.join(train.MODELS_DIR, f)) for f in ARQUIVOS):
                atual = avaliar.avaliar_diretorio(train.MODELS_DIR, engine)

            nota_c = avaliar.nota(cand)
            nota_a = avaliar.nota(atual) if atual else None
            promover = forcar or atual is None or nota_c >= nota_a
            if promover:
                os.makedirs(train.MODELS_DIR, exist_ok=True)
                for f in ARQUIVOS:
                    tmp = os.path.join(train.MODELS_DIR, f + ".novo")
                    shutil.copyfile(os.path.join(cand_dir, f), tmp)
                    os.replace(tmp, os.path.join(train.MODELS_DIR, f))  # troca atômica

            avaliar.registrar(cand, "retreino", promover, engine)
            return {
                "ok": True,
                "promovido": promover,
                "nota_candidato": nota_c,
                "nota_atual": nota_a,
                "exemplos_treino": len(exemplos),
                "candidato": cand,
                "atual": atual,
                "motivo": None if promover else "O candidato ficou pior que o modelo atual; mantido o atual.",
            }
        finally:
            shutil.rmtree(cand_dir, ignore_errors=True)
    finally:
        _lock.release()


if __name__ == "__main__":
    import json
    print(json.dumps(executar("--forcar" in sys.argv), ensure_ascii=False, indent=2, default=str))
