'use client';

import '@excalidraw/excalidraw/index.css';
import { useCallback, useRef } from 'react';
import { Excalidraw, getSceneVersion, restore } from '@excalidraw/excalidraw';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { useAppTheme } from '@/lib/hooks/use-app-theme';

export type WhiteboardScene = {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

type Props = {
  initialScene: unknown;
  onChange: (scene: WhiteboardScene) => void;
};

function toInitialData(scene: unknown): ExcalidrawInitialDataState {
  const source =
    scene && typeof scene === 'object'
      ? (scene as Pick<ExcalidrawInitialDataState, 'elements' | 'appState' | 'files'>)
      : null;
  const restored = restore(source, null, null);
  return { ...restored, scrollToContent: true };
}

function persistableAppState(appState: AppState): Partial<AppState> {
  const { collaborators: _collaborators, ...rest } = appState;
  return rest;
}

/**
 * Canvas Excalidraw. Client-only (chargé via `dynamic(ssr:false)`) : la librairie
 * accède au DOM/`window` et ne rend pas côté serveur.
 */
export function WhiteboardCanvas({ initialScene, onChange }: Props) {
  const theme = useAppTheme();
  const initialData = useRef(toInitialData(initialScene));
  const lastVersion = useRef(getSceneVersion(initialData.current.elements ?? []));

  const handleChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      const version = getSceneVersion(elements);
      if (version === lastVersion.current) return;
      lastVersion.current = version;
      onChange({ elements, appState: persistableAppState(appState), files });
    },
    [onChange],
  );

  return (
    <Excalidraw
      initialData={initialData.current}
      theme={theme}
      onChange={handleChange}
    />
  );
}
