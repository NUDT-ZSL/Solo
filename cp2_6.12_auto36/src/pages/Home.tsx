import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import KnowledgeBasePage from './KnowledgeBasePage';

export default function Home() {
  const navigate = useNavigate();
  const knowledgeBases = useKnowledgeStore((s) => s.knowledgeBases);
  const fetchKnowledgeBases = useKnowledgeStore((s) => s.fetchKnowledgeBases);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  useEffect(() => {
    if (knowledgeBases.length > 0) {
      const first = knowledgeBases[0];
      navigate(`/kb/${first.id}`, { replace: true });
    }
  }, [knowledgeBases, navigate]);

  if (knowledgeBases.length === 0) {
    return <KnowledgeBasePage />;
  }

  return null;
}
