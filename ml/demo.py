# -*- coding: utf-8 -*-
"""Demo ponta a ponta: treina (se preciso), reconhece e preenche os templates."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fill as filler
import templates
import train

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SAMPLE_DATA = {
    "numero_proposta": "10099999",
    "cliente": "Banco Exemplo S.A.",
    "tipo_laudo": "LAUDO MANUAL INTERNO",
    "matricula": "123456",
    "tipologia": "Apartamento",
    "unidade": "102",
    "andar": "11º",
    "bloco_torre": "B",
    "empreendimento": "Residencial Mar Azul",
    "tipo_endereco": "Rua",
    "endereco": "Av. dos Pescadores",
    "numero": "1500",
    "bairro": "Boqueirão",
    "cidade": "Praia Grande",
    "uf": "SP",
    "cep": "11700-000",
    "latitude": -24.0071,
    "longitude": -46.4125,
    "area_privativa": 68.5,
    "engenheiro_responsavel": "Eng. Sara Menezes",
}


def main():
    os.chdir(BASE_DIR)

    if not (os.path.exists(os.path.join(train.MODELS_DIR, "recognizer.joblib"))
            and os.path.exists(os.path.join(train.MODELS_DIR, "mapper.joblib"))):
        train.main()

    v22 = os.path.join("data", "templates", "Homogeneização_Unidades Isoladas_2025_V22.xlsx")
    v25 = os.path.join("data", "templates", "Homogeneização_unidades padronizadas_2026_V25.xlsm")

    print("\n== 1. RECONHECIMENTO DE TEMPLATE ==")
    for path in (v22, v25):
        tid = filler.recognize(path)
        print(f"  {os.path.basename(path)}")
        print(f"      -> {tid}  ({templates.TEMPLATES[tid]})")

    print("\n== 2. PREENCHIMENTO ==")
    for path, out in ((v22, "data/output/V22_preenchida.xlsx"),
                      (v25, "data/output/V25_preenchida.xlsm")):
        tid, written = filler.fill(path, SAMPLE_DATA, out)
        print(f"  {os.path.basename(out)}  [template={tid}]")
        for campo, aba, cel, valor in written:
            print(f"      {campo:22s} -> {aba}!{cel} = {valor!r}")

    print("\n== 3. MAPEADOR (generaliza para rótulos fora do treino) ==")
    mapper = filler.load_mapper()
    for rotulo in ("AREA PRIVATIVA DO APARTAMENTO", "proposta", "cliente", "UF", "numero de dormitorios"):
        pred = mapper.predict([rotulo])[0]
        print(f"  '{rotulo}'  ->  {pred}")


if __name__ == "__main__":
    main()
