import { useNavigate } from 'react-router-dom'
import { ExhibitionListItem } from '../types'

interface ExhibitionListProps {
  exhibitions: ExhibitionListItem[]
}

function ExhibitionList({ exhibitions }: ExhibitionListProps) {
  const navigate = useNavigate()

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return '即将开展'
      case 'ongoing': return '进行中'
      case 'ended': return '已结束'
      default: return status
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <div>
      <h2 className="page-title">全部展览</h2>
      {exhibitions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <div className="empty-state-text">暂无展览，点击右上角新建</div>
        </div>
      ) : (
        <div className="exhibition-list">
          {exhibitions.map((exhibition) => (
            <div
              key={exhibition.id}
              className={`exhibition-card ${exhibition.status}`}
              onClick={() => navigate(`/exhibition/${exhibition.id}`)}
            >
              <h3>{exhibition.name}</h3>
              <p className="date">
                {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
              </p>
              <p className="artwork-count">共 {exhibition.artworkCount} 件展品</p>
              <span className="status-badge">{getStatusText(exhibition.status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExhibitionList
