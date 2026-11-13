// Laboratorios que se pueden hacer en el navegador, sin instalar nada: escenarios de Killercoda
// (repositorio aparte, ruta-cloud-native-labs). Cada uno abre un clúster real de dos nodos durante una hora.
// Un módulo sin entrada aquí solo tiene laboratorio local.
const BASE = 'https://killercoda.com/dan9631/scenario/';

export interface LabWeb { titulo: string; minutos: number; url: string }

const lab = (carpeta: string, titulo: string, minutos: number): LabWeb => ({ titulo, minutos, url: BASE + carpeta });

const LABS: Record<string, LabWeb[]> = {
  '03': [
    lab('03-1-pods', 'Pods, labels y ReplicaSets', 30),
    lab('03-2-deployments', 'Deployments, configuración y Jobs', 40),
    lab('03-3-reto', 'Reto', 20),
  ],
};

/** Escenarios en el navegador del módulo (`'03'`); vacío si no tiene */
export const labsWeb = (modulo: string): LabWeb[] => LABS[modulo] ?? [];
