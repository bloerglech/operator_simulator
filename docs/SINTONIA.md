# Sintonía de los lazos: pruebas de escalón

Generado por `npm run sintonia` (herramientas/sintonia.js). Cada lazo parte
del caso base cerca del estado estacionario (8 h sin control y luego control
en automático; los esclavos en cascada se prueban en AUTO). Se aplica un
escalón de consigna y se mide sobre el promedio móvil (30 s, o el configurado)
de la medición filtrada del transmisor, sin su ruido blanco:
sobrepaso (% del escalón), tiempo de asentamiento (último instante fuera de
±10 % del escalón, o de la banda absoluta configurada para variables que
fluctúan por sí mismas) y oscilación sostenida (amplitud en el último tercio
de la prueba mayor que esa banda). Los límites están en `config/lazos.json`
("prueba") y son supuestos de diseño, no datos de planta.

| Lazo | Kc | Ti (s) | Escalón | Sobrepaso % | Asentamiento s | Salida % | Cumple |
|------|----|--------|---------|-------------|----------------|----------|--------|
| WIC-101 | 0.3 | 8 | -10 t/h | 1.1 (≤ 20) | 65 (≤ 120) | 53–55 | sí |
| LIC-102 | 3 | 900 | -5 % | 28.1 (≤ 30) | 3010 (≤ 7200) | 34–58 | sí |
| FIC-111 | 0.3 | 4 | 20 m3/h | 2.3 (≤ 20) | 40 (≤ 120) | 43–45 | sí |
| FIC-112 | 0.3 | 4 | 5 m3/h | 1.9 (≤ 20) | 40 (≤ 120) | 35–37 | sí |
| FIC-113 | 0.3 | 4 | 10 m3/h | 2.4 (≤ 20) | 35 (≤ 120) | 35–37 | sí |
| FIC-114 | 0.3 | 4 | 10 m3/h | 1.3 (≤ 20) | 40 (≤ 120) | 36–37 | sí |
| FIC-115 | 0.3 | 4 | 20 m3/h | 2.4 (≤ 20) | 40 (≤ 120) | 55–57 | sí |
| FIC-116 | 0.3 | 4 | 20 m3/h | 1.8 (≤ 20) | 35 (≤ 120) | 48–50 | sí |
| PIC-201 | 2 | 40 | -0.3 bar(g) | 3.8 (≤ 30) | 0 (≤ 900) | 56–60 | sí |
| LIC-202 | 4 | 1800 | -0.5 m | 0.0 (≤ 30) | 2160 (≤ 3600) | 46–66 | sí |
| FIC-211 | 0.3 | 4 | 50 m3/h | 3.1 (≤ 20) | 40 (≤ 120) | 63–64 | sí |
| TIC-212 | 6 | 60 | -2 °C | 7.3 (≤ 20) | 295 (≤ 1200) | 57–67 | sí |
| PIC-301 | 3 | 30 | 0.3 bar(g) | 10.5 (≤ 30) | 20 (≤ 900) | 54–65 | sí |
| LIC-302 | 6 | 1500 | -1 m | 29.4 (≤ 40) | 1575 (≤ 5400) | 43–73 | sí |
| FIC-401 | 0.3 | 4 | 50 m3/h | 2.8 (≤ 20) | 40 (≤ 120) | 69–70 | sí |
| TIC-402 | 4 | 60 | 2 °C | 5.3 (≤ 20) | 200 (≤ 1200) | 74–78 | sí |
| FIC-403 | 0.3 | 4 | 50 m3/h | 4.1 (≤ 20) | 40 (≤ 120) | 69–70 | sí |
| TIC-404 | 4 | 60 | 2 °C | 5.6 (≤ 20) | 215 (≤ 1200) | 72–77 | sí |
| FIC-405 | 0.3 | 4 | 15 m3/h | 2.6 (≤ 20) | 40 (≤ 120) | 38–40 | sí |
| FIC-406 | 0.3 | 4 | 15 m3/h | 1.6 (≤ 20) | 40 (≤ 120) | 48–49 | sí |
| FIC-501 | 0.3 | 4 | 10 m3/h | 2.0 (≤ 20) | 40 (≤ 120) | 26–28 | sí |
| FIC-503 | 0.3 | 4 | 40 m3/h | 2.7 (≤ 20) | 40 (≤ 120) | 54–56 | sí |
| LIC-510 | 2 | 300 | -10 % | 0.4 (≤ 30) | 420 (≤ 1800) | 36–64 | sí |
| LIC-511 | 2 | 300 | -10 % | 0.8 (≤ 30) | 295 (≤ 1800) | 34–69 | sí |
| FIC-601 | 0.3 | 4 | 60 m3/h | 3.2 (≤ 20) | 40 (≤ 120) | 61–63 | sí |
| FIC-602 | 0.3 | 4 | 15 m3/h | 3.1 (≤ 20) | 40 (≤ 120) | 40–42 | sí |
| CIC-605 | 1 | 300 | -0.5 % | 3.2 (≤ 30) | 1370 (≤ 1800) | 48–58 | sí |
| TIC-604 | 4 | 1200 | 2 °C | 25.7 (≤ 40) | 4215 (≤ 7200) | 43–55 | sí |
| FDC-607 | 1 | 300 | 0.3 - | 4.7 (≤ 30) | 310 (≤ 3600) | 60–64 | sí |
