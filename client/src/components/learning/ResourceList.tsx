import { ExternalLink, FileText, Download } from 'lucide-react';
import type { Resource } from '../../api';

interface ResourceListProps {
  resources: Resource[];
}

export default function ResourceList({ resources }: ResourceListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'link': return <ExternalLink className="w-4 h-4" />;
      case 'template': return <Download className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-burnt-tint text-burnt border-burnt/20';
      case 'link': return 'bg-cream text-charcoal border-sand';
      case 'template': return 'bg-noir text-cream border-noir';
      default: return 'bg-sand text-ink border-sand-dark';
    }
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-8 text-charcoal text-sm">
        No resources available for this module.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((resource, index) => (
        <a
          key={index}
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-w-0 items-center justify-between gap-3 rounded-[24px] border border-sand bg-alabaster p-4 shadow-bento transition-all hover:border-sand-dark"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 p-2 rounded-xl border ${getTypeColor(resource.type)}`}>
              {getIcon(resource.type)}
            </div>
            <div className="min-w-0">
              <h4 className="break-words font-display text-sm font-bold text-ink">{resource.title}</h4>
              <span className="font-mono text-xs text-charcoal capitalize">{resource.type}</span>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-charcoal transition-colors group-hover:text-burnt" />
        </a>
      ))}
    </div>
  );
}
