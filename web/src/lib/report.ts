// Enlaces "Reportar un error": abren el formulario .github/ISSUE_TEMPLATE/error-contenido.yml
// con la ubicación y el contexto ya rellenados (GitHub admite prellenar campos por su id en la URL).
// Solo se envía información del propio curso: nunca datos del alumno.
import { pad } from './modules';

export const REPO_URL = 'https://github.com/Dan9631/KubernetesLearningKCNA';
const TEMPLATE = 'error-contenido.yml';
// GitHub responde 414 con URLs muy largas: el contexto se recorta por debajo de ese límite
const MAX_CONTEXT = 3500;

function issueUrl(title: string, ubicacion: string, contexto: string): string {
  const params = new URLSearchParams({
    template: TEMPLATE,
    title: `[Error] ${title}`,
    ubicacion,
    contexto: contexto.length > MAX_CONTEXT ? contexto.slice(0, MAX_CONTEXT) + '…' : contexto,
  });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export function reportModule(n: number, title: string, pageUrl: string): string {
  const where = `Módulo ${pad(n)} · ${title}`;
  return issueUrl(where, `${where} (sección: )`, `Página: ${pageUrl}\nArchivo: curso/${pad(n)}-*.md`);
}

export interface ReportableQuestion {
  id: string; topic: string; module: number; q: string; options: string[]; answer: number[]; source?: string[];
}

export function reportQuestion(q: ReportableQuestion): string {
  const where = `Pregunta ${q.id} (módulo ${pad(q.module)}, ${q.topic})`;
  const correct = q.answer.map((i) => `- ${q.options[i]}`).join('\n');
  const contexto = [
    `Pregunta: ${q.q}`,
    '',
    'Opciones:',
    ...q.options.map((o) => `- ${o}`),
    '',
    'Marcada como correcta:',
    correct,
    '',
    `Fuente citada: ${q.source?.join(' ') || '(ninguna)'}`,
    `Archivo: quiz/src/src_${q.id[0].toLowerCase()}.js`,
  ].join('\n');
  return issueUrl(where, where, contexto);
}
