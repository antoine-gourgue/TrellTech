import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';

const proseClasses = cn(
  'text-base leading-relaxed text-text',
  '[&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold',
  '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-md [&_h2]:font-semibold',
  '[&_h3]:mb-1.5 [&_h3]:mt-2.5 [&_h3]:text-base [&_h3]:font-semibold',
  '[&_p]:my-2',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:my-0.5',
  '[&_a]:font-medium [&_a]:text-brand [&_a]:underline',
  '[&_code]:rounded-sm [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm',
  '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-surface-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-text-muted',
  '[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
  '[&_th]:border [&_th]:border-border [&_th]:bg-surface-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
  '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
  '[&_hr]:my-3 [&_hr]:border-border',
  '[&_input[type=checkbox]]:mr-1.5',
);

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn(proseClasses, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
