import { useState } from 'react';
import { CodeBlock as CodeBlockType } from '@/types/brandBlocks';
import { Trash2, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

interface CodeBlockProps {
  block: CodeBlockType;
  onUpdate: (content: CodeBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'css', 'html', 'json', 
  'bash', 'sql', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'c', 
  'cpp', 'csharp', 'yaml', 'markdown', 'xml', 'plaintext'
];

export const CodeBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: CodeBlockProps) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState(block.content.code || '');
  const [language, setLanguage] = useState(block.content.language || 'javascript');

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onUpdate({ 
      code: newCode, 
      language, 
      show_line_numbers: block.content.show_line_numbers 
    });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    onUpdate({ 
      code, 
      language: newLanguage, 
      show_line_numbers: block.content.show_line_numbers 
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative py-2">
      {!isPreviewMode && (
        <button
          onClick={onDelete}
          className="absolute -right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 z-10"
        >
          <Trash2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
          {!isPreviewMode ? (
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-zinc-600 dark:text-zinc-400 cursor-pointer"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-zinc-600 dark:text-zinc-400">{language}</span>
          )}
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>

        {!isPreviewMode ? (
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Enter code..."
            className="w-full p-4 bg-transparent text-sm font-mono resize-none outline-none text-foreground min-h-[120px]"
            spellCheck={false}
          />
        ) : (
          <SyntaxHighlighter
            language={language}
            style={theme === 'dark' ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '0.875rem'
            }}
            showLineNumbers={block.content.show_line_numbers}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
};
