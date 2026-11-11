import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = 'javascript' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const syntaxHighlight = (code: string, _lang: string) => {
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Keywords
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'from', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this'];
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, 'g');
      highlighted = highlighted.replace(regex, '<span class="text-burnt">$1</span>');
    });

    // Strings
    highlighted = highlighted.replace(/(&#39;[^&#39;]*&#39;|&quot;[^&quot;]*&quot;|`[^`]*`)/g, '<span class="text-sand">$1</span>');
    highlighted = highlighted.replace(/('[^']*'|"[^"]*")/g, '<span class="text-sand">$1</span>');

    // Numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>');

    // Comments
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-cream/50 italic">$1</span>');

    return highlighted;
  };

  return (
    <div className="relative rounded-2xl border border-sand overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-cream border-b border-sand">
        <span className="font-mono text-xs font-medium text-charcoal uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-charcoal hover:text-ink transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-burnt" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="max-w-full p-4 bg-noir text-cream/90 text-sm overflow-x-auto">
        <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(code, language) }} />
      </pre>
    </div>
  );
}
