// Contabilidad de balances: inventario de la planta y acumulados de lo que
// entra y sale. Permite verificar el cierre de masa (licor, cada especie,
// madera) y de energía en cualquier momento.

import { capacidadParcela } from './materia.js'

/** Cantidades vacías: licor (m³), esp (Σ c·v por especie), madera (kg), energia (kJ). */
export function cantidadesVacias(nEsp) {
  return { licor: 0, esp: new Array(nEsp).fill(0), madera: 0, energia: 0 }
}

/** Suma a `acc` el contenido de un licor. */
export function sumarLicorA(acc, licor, fis, signo = 1) {
  if (licor.v <= 0) return
  acc.licor += signo * licor.v
  for (let k = 0; k < acc.esp.length; k++) acc.esp[k] += signo * licor.v * licor.c[k]
  acc.energia += signo * fis.rcpLicor * licor.v * licor.T
}

/** Suma a `acc` el contenido de una parcela (madera + licor retenido). */
export function sumarParcelaA(acc, par, fis, signo = 1) {
  acc.madera += signo * par.m
  acc.licor += signo * par.vr
  for (let k = 0; k < acc.esp.length; k++) acc.esp[k] += signo * par.vr * par.cr[k]
  acc.energia += signo * capacidadParcela(par, fis) * par.T
}

/** Suma a `acc` un paquete (licor + parcelas). */
export function sumarPaqueteA(acc, paq, fis, signo = 1) {
  sumarLicorA(acc, paq.licor, fis, signo)
  for (const par of paq.parcelas) sumarParcelaA(acc, par, fis, signo)
}

/** Inventario completo de la planta. */
export function inventario(modelo, estado) {
  const { fis } = modelo
  const acc = cantidadesVacias(modelo.especies.length)
  for (const v of modelo.vasos) {
    const ev = estado.vasos[v.id]
    for (let j = 0; j < v.geom.n; j++) {
      sumarLicorA(acc, { v: ev.vf[j], T: ev.T[j], c: ev.c.map((ck) => ck[j]) }, fis)
    }
    for (const par of ev.parcelas) sumarParcelaA(acc, par, fis)
  }
  for (const tubo of Object.values(estado.tubos)) {
    for (const paq of tubo.paquetes) sumarPaqueteA(acc, paq, fis)
  }
  return acc
}

/**
 * Error de cierre de cada balance:
 *   error = (inventario − inventario inicial) − (entradas − salidas)
 * relativo al flujo acumulado o al inventario, el que sea mayor.
 */
export function cierreBalances(modelo, estado) {
  const inv = inventario(modelo, estado)
  const { inv0, entra, sale, produccion: pr } = estado.contabilidad
  // error = Δinventario − (entradas − salidas + producción por reacción)
  const rel = (actual, inicial, e, s, g) => {
    const err = actual - inicial - (e - s + g)
    const escala = Math.max(Math.abs(e) + Math.abs(s), Math.abs(g), Math.abs(actual), Math.abs(inicial), 1e-12)
    return { error: err, relativo: Math.abs(err) / escala }
  }
  // Materia orgánica: lo que pierde la madera aparece disuelto en el licor.
  const org = ['LD', 'XD', 'CD', 'OD'].reduce((s, id) => s + pr.esp[modelo.idx[id]], 0)
  return {
    licor: rel(inv.licor, inv0.licor, entra.licor, sale.licor, pr.licor),
    madera: rel(inv.madera, inv0.madera, entra.madera, sale.madera, pr.madera),
    energia: rel(inv.energia, inv0.energia, entra.energia, sale.energia, pr.energia),
    especies: Object.fromEntries(
      modelo.especies.map((e, k) => [e.id, rel(inv.esp[k], inv0.esp[k], entra.esp[k], sale.esp[k], pr.esp[k])]),
    ),
    organica: { error: pr.madera + org, relativo: Math.abs(pr.madera + org) / Math.max(Math.abs(pr.madera), 1e-12) },
  }
}
