# -*- coding: utf-8 -*-
"""Treina o reconhecedor de template e o mapeador de campos a partir do PostgreSQL (schema ml_data), salvando em models/."""
import os
import joblib
import pandas as pd
from sqlalchemy import create_engine
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

import fields
import templates

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.abspath(os.path.join(BASE_DIR, "models"))


def get_db_engine():
    """Constrói a conexão SQLAlchemy usando as variáveis de ambiente do container/Azure."""
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "avalliar-db")
    db_user = os.getenv("DB_USER", "avalliar")
    db_password = os.getenv("DB_PASSWORD", "")
    db_sslmode = os.getenv("DB_SSLMODE", "require")
    
    connection_url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?sslmode={db_sslmode}"
    return create_engine(connection_url)


def collect_recognizer_examples_from_db():
    """Consulta o schema ml_data no PostgreSQL para obter os textos e labels de treino."""
    try:
        engine = get_db_engine()
        query = "SELECT sheet_text, label FROM ml_data.recognizer_examples"
        df = pd.read_sql(query, con=engine)
        return list(zip(df['sheet_text'], df['label']))
    except Exception as e:
        print(f"  [aviso] Erro ao buscar exemplos do banco: {e}")
        return []


def train_recognizer(examples):
    if not examples:
        # Fallback de segurança com 2 classes para o scikit-learn não falhar no build inicial
        x = [
            "v22 unidades isoladas template padrão",
            "v25 unidades padronizadas template padrão"
        ]
        y = [
            "v22_unidades_isoladas",
            "v25_unidades_padronizadas"
        ]
    else:
        x = [item[0] for item in examples]
        y = [item[1] for item in examples]

    model = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])
    model.fit(x, y)
    return model


def collect_mapper_examples_from_db():
    """Exemplos extras do mapeador (ml_data.mapper_examples): textos que NÃO são rótulos."""
    try:
        df = pd.read_sql("SELECT rotulo, campo FROM ml_data.mapper_examples", con=get_db_engine())
        return list(zip(df["rotulo"], df["campo"]))
    except Exception as e:
        print(f"  [aviso] Sem exemplos extras do mapeador no banco: {e}")
        return []


def train_mapper(extras=None):
    """Mapeia texto de célula -> campo canônico (ou '__nenhum__' se não for rótulo)."""
    pares = list(fields.TRAINING_PAIRS) + list(extras or [])
    x = [templates.normalize(rotulo) for rotulo, _ in pares]
    y = [campo for _, campo in pares]
    model = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5))),
        ("clf", LogisticRegression(max_iter=1000, C=10)),
    ])
    model.fit(x, y)
    return model


def treinar(models_dir):
    """Treina os dois modelos a partir do banco e salva em `models_dir`."""
    os.makedirs(models_dir, exist_ok=True)

    print("Coletando exemplos para o reconhecedor do PostgreSQL (schema ml_data)...")
    examples = collect_recognizer_examples_from_db()
    print(f"  {len(examples)} exemplos carregados do banco")

    print("Treinando reconhecedor de template...")
    recognizer = train_recognizer(examples)
    joblib.dump(recognizer, os.path.join(models_dir, "recognizer.joblib"))

    extras = collect_mapper_examples_from_db()
    print(f"Treinando mapeador de campos (rótulo -> campo canônico) com {len(extras)} exemplos extras...")
    mapper = train_mapper(extras)
    joblib.dump(mapper, os.path.join(models_dir, "mapper.joblib"))

    print(f"Modelos salvos em {models_dir}")
    return recognizer, mapper


def main():
    treinar(MODELS_DIR)

    # Mede no conjunto reservado e guarda no histórico (não derruba o startup se falhar).
    try:
        import avaliar
        engine = get_db_engine()
        metricas = avaliar.avaliar_diretorio(MODELS_DIR, engine)
        avaliar.registrar(metricas, "startup", True, engine)
        print(f"Avaliação no conjunto reservado: nota {avaliar.nota(metricas)} "
              f"(reconhecedor {metricas['reconhecedor'].get('acuracia')})")
    except Exception as e:
        print(f"  [aviso] avaliação não registrada: {e}")


if __name__ == "__main__":
    main()