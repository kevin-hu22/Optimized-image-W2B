/**
 * Herramientas internas de W2B.
 *
 * Las tres apps del equipo (CRM, Tasks, Optimizer) muestran esta misma lista
 * para saltar entre ellas. Cada app marca su propio `id` como actual.
 *
 * Esta lista esta duplicada en los repos crm-w2b y Task-Manager-W2B. Son tres
 * despliegues independientes: un paquete compartido seria mas maquinaria que
 * problema para tres URLs. Al agregar una herramienta nueva, actualizar los
 * tres archivos.
 */
export type ToolId = 'crm' | 'tasks' | 'optimizer';

export type Tool = {
  id: ToolId;
  label: string;
  description: string;
  url: string;
};

export const W2B_TOOLS: Tool[] = [
  {
    id: 'crm',
    label: 'CRM',
    description: 'Pipeline, contactos y cotizaciones',
    url: 'https://crm.w2bagency.com/',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    description: 'Proyectos, tareas y dailies del equipo',
    url: 'https://task.w2bagency.com/',
  },
  {
    id: 'optimizer',
    label: 'Optimizer',
    description: 'Optimizacion local de imagenes y video',
    url: 'https://optimized-image-w2b.vercel.app/',
  },
];

/** Las otras herramientas — las que si son un link desde la app actual. */
export function otherTools(current: ToolId): Tool[] {
  return W2B_TOOLS.filter((tool) => tool.id !== current);
}
