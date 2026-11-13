# -*- coding: utf-8 -*-
"""terreno.completar: preenche só o que falta; o 1 do avaliador só é trocado com trocar_um=True."""
import terreno

a = [{"area_equivalente": 150}, {"area_equivalente": 80, "area_terreno": 1, "frente_efetiva": 1},
     {"area_equivalente": 100, "area_terreno": 300, "frente_efetiva": 12}]
est = terreno.completar(a)
assert a[0]["area_terreno"] == 262 and a[0]["frente_efetiva"] == 7, a[0]
assert a[1]["area_terreno"] == 1 and a[1]["frente_efetiva"] == 1, "o 1 do avaliador não pode mudar"
assert a[2]["area_terreno"] == 300 and a[2]["frente_efetiva"] == 12, "valores reais não podem mudar"
assert len(est) == 2
b = [{"area_equivalente": 80, "area_terreno": 1, "frente_efetiva": 1}]
terreno.completar(b, trocar_um=True)
assert b[0]["area_terreno"] == 140 and b[0]["frente_efetiva"] == 5, b[0]
assert not terreno.valido({"area_terreno": 1, "frente_efetiva": 1}) and terreno.valido({"area_terreno": 300, "frente_efetiva": 12})
print("test_terreno OK")
