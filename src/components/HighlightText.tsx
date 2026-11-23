import { splitHighlightSegments } from '../lib/memoryParser';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export function HighlightText({ text, query, className }: HighlightTextProps) {
  const segments = splitHighlightSegments(text, query);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={index} className="bg-amber-200/90 text-slate-950 font-medium px-0.5 rounded-xs">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
}
