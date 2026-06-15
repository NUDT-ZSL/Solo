import React, { useState, useEffect, useCallback } from 'react'
import { apiClient, Dispute, DisputeStatus } from '../services/apiClient'
import { globalCss } from './shared'
import DisputeList from './DisputeList'
import DisputeDetail from './DisputeDetail'

const DisputeConsole: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [listFading, setListFading] = useState(false)
  const [detailKey, setDetailKey] = useState(0)

  const hasMore = disputes.length < total

  const fetchDisputes = useCallback(async (
    pageNum: number,
    type: string,
    sDate: string,
    eDate: string,
    append: boolean = false
  ) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    try {
      const res = await apiClient.getDisputes({
        page: pageNum,
        pageSize: 10,
        type: type !== 'all' ? type : undefined,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
      })
      setTotal(res.total)
      if (append) {
        setDisputes(prev => [...prev, ...res.data])
      } else {
        setDisputes(res.data)
      }
      setPage(pageNum)
      if (res.data.length > 0 && !selectedId && !append) {
        setSelectedId(res.data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch disputes:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedId])

  useEffect(() => {
    fetchDisputes(1, filterType, startDate, endDate)
  }, [])

  useEffect(() => {
    setListFading(true)
    const timer = setTimeout(() => {
      fetchDisputes(1, filterType, startDate, endDate)
      setTimeout(() => setListFading(false), 50)
    }, 200)
    return () => clearTimeout(timer)
  }, [filterType, startDate, endDate, fetchDisputes])

  useEffect(() => {
    if (!selectedId) return
    const fetchDetail = async () => {
      try {
        const res = await apiClient.getDisputeById(selectedId)
        setSelectedDispute(res.data)
        setDetailKey(prev => prev + 1)
      } catch (err) {
        console.error('Failed to fetch dispute detail:', err)
      }
    }
    fetchDetail()
  }, [selectedId])

  const handleStatusChange = async (status: DisputeStatus) => {
    if (!selectedDispute) return
    try {
      const res = await apiClient.updateDisputeStatus(selectedDispute.id, status)
      setSelectedDispute(res.data)
      setDisputes(prev => prev.map(d => d.id === res.data.id ? res.data : d))
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleDisputeUpdate = (updated: Dispute) => {
    setSelectedDispute(updated)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{globalCss}</style>

      <header style={{
        backgroundColor: '#4A3728',
        color: '#fff',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <span style={{ fontSize: '24px' }}>🐾</span>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>宠物寄养纠纷调解工作台</h1>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        <DisputeList
          disputes={disputes}
          total={total}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          selectedId={selectedId}
          filterType={filterType}
          startDate={startDate}
          endDate={endDate}
          listFading={listFading}
          onSelectedIdChange={setSelectedId}
          onFilterTypeChange={setFilterType}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onLoadMore={() => fetchDisputes(page + 1, filterType, startDate, endDate, true)}
        />

        <div key={detailKey} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {selectedDispute ? (
            <DisputeDetail
              dispute={selectedDispute}
              onStatusChange={handleStatusChange}
              onDisputeUpdate={handleDisputeUpdate}
            />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <div>请从左侧选择一个纠纷查看详情</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DisputeConsole
