import { ExternalLink } from 'lucide-react';
import { otherTools, type ToolId } from '../lib/tools';

/**
 * Acceso a las otras herramientas del equipo desde el header.
 *
 * Abren en pestana nueva a proposito: son apps aparte, y el optimizador suele
 * tener trabajo a medio procesar en memoria que se perderia al navegar.
 */
export default function ToolSwitcher({ current = 'optimizer' }: { current?: ToolId }) {
  const tools = otherTools(current);
  if (tools.length === 0) return null;

  return (
    <nav aria-label="Otras herramientas de W2B" className="flex items-center gap-1">
      {tools.map((tool) => (
        <a
          key={tool.id}
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          title={tool.description}
          className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          {tool.label}
          <ExternalLink className="w-3.5 h-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
        </a>
      ))}
    </nav>
  );
}
