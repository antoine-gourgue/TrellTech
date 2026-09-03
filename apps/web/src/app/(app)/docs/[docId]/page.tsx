import { DocView } from '@/components/content/doc-view';

export default async function DocPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  return <DocView docId={docId} />;
}
