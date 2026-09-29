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
      case 'pdf': return 'bg-red-100 text-red-700 border-red-200';
      case 'link': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'template': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
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
          className="flex min-w-0 items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 p-2 rounded-lg border ${getTypeColor(resource.type)}`}>
              {getIcon(resource.type)}
            </div>
            <div className="min-w-0">
              <h4 className="break-words text-sm font-medium text-slate-900">{resource.title}</h4>
              <span className="text-xs text-slate-500 capitalize">{resource.type}</span>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
        </a>
      ))}
    </div>
  );
}
