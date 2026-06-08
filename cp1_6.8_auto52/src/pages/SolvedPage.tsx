import { useEffect } from 'react'
import { useMysteryStore } from '@/store/useMysteryStore'
import ResultList from '@/components/ResultList'
import { Trophy } from 'lucide-react'

export default function SolvedPage() {
  const { solvedList, fetchSolved } = useMysteryStore()

  useEffect(() => {
    fetchSolved()
  }, [fetchSolved])

  return <ResultList />
}
