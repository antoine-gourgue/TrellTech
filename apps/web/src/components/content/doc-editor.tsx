'use client';

import '@blocknote/mantine/style.css';
import { useEffect, useRef } from 'react';
import type { Block, PartialBlock } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useAppTheme } from '@/lib/hooks/use-app-theme';

type Props = {
  initialBlocks: unknown;
  onChange: (blocks: Block[]) => void;
};

function toInitialContent(blocks: unknown): PartialBlock[] | undefined {
  return Array.isArray(blocks) && blocks.length > 0 ? (blocks as PartialBlock[]) : undefined;
}

/**
 * Éditeur à blocs BlockNote. Client-only (chargé via `dynamic(ssr:false)`) :
 * BlockNote dépend du DOM et ne rend pas côté serveur.
 */
export function DocEditor({ initialBlocks, onChange }: Props) {
  const theme = useAppTheme();
  const editor = useCreateBlockNote({ initialContent: toInitialContent(initialBlocks) });
  const hydrated = useRef(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      hydrated.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      onChange={() => {
        if (!hydrated.current) return;
        onChange(editor.document);
      }}
    />
  );
}
