export type MarkdownBodyProps = { content: string };

export function MarkdownBody({ content }: MarkdownBodyProps) {
  return (
    <div className="bg-surface-2/30 rounded-lg p-6 overflow-x-auto">
      <pre className="text-sm text-fg whitespace-pre-wrap font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  );
}
