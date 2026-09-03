import { WhiteboardView } from '@/components/content/whiteboard-view';

export default async function WhiteboardPage({
  params,
}: {
  params: Promise<{ wbId: string }>;
}) {
  const { wbId } = await params;
  return <WhiteboardView whiteboardId={wbId} />;
}
