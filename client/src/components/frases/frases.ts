// src/content/frases.ts
export const FRASES: string[] = [
  "La logística perfecta es la que no notas.",
  "Pequeños ajustes, grandes ahorros.",
  "Mide dos veces, envía una.",
  "Cada pedido cuenta una historia.",
  "La visibilidad es poder.",
  "Hoy optimizamos, mañana escalamos."
];

// (opcional) util para elegir una al azar
export function fraseAleatoria(list = FRASES) {
  return list[Math.floor(Math.random() * list.length)];
}
