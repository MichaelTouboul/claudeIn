export default function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-6 overflow-x-auto">
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  );
}
