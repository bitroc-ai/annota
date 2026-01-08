import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  code: string;
}

export default function Mermaid({ code }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramIdRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Mermaid with theme based on dark mode
    const isDark = document.documentElement.classList.contains('dark');
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      themeVariables: {
        primaryColor: isDark ? '#38bdf8' : '#0ea5e9',
        primaryTextColor: isDark ? '#f1f5f9' : '#0f172a',
        primaryBorderColor: isDark ? '#1e293b' : '#e2e8f0',
        lineColor: isDark ? '#94a3b8' : '#64748b',
        secondaryColor: isDark ? '#1e293b' : '#f8fafc',
        tertiaryColor: isDark ? '#0a0f1a' : '#ffffff',
      },
    });

    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render(diagramIdRef.current, code);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">Error rendering Mermaid diagram: ${error instanceof Error ? error.message : String(error)}</pre>`;
        }
      }
    };

    renderDiagram();
  }, [code]);

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      style={{ 
        backgroundColor: 'var(--muted)',
        borderColor: 'var(--border)',
      }}
    />
  );
}

