import { DisputeStatus } from '../services/apiClient'

export const disputeTypeLabels: Record<string, string> = {
  all: '全部类型',
  service_incomplete: '服务未完成',
  health_issue: '健康问题',
  fee_dispute: '费用争议',
}

export const statusLabels: Record<DisputeStatus, string> = {
  pending: '待处理',
  mediating: '调解中',
  resolved: '已解决',
}

export const roleLabels: Record<string, string> = {
  owner: '宠物主人',
  sitter: '寄养人',
  customer_service: '客服',
}

export const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export const formatDateShort = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

export const getStatusGradient = (status: DisputeStatus): string => {
  switch (status) {
    case 'pending': return 'linear-gradient(135deg, #FFB74D, #FF8C00)'
    case 'mediating': return 'linear-gradient(135deg, #64B5F6, #1976D2)'
    case 'resolved': return 'linear-gradient(135deg, #81C784, #388E3C)'
  }
}

export const globalCss = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes bounce {
    0%, 100% { transform: scale(1); }
    30% { transform: scale(1.4); }
    60% { transform: scale(0.9); }
  }
  @keyframes statusPulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  button:active {
    transform: scale(0.95) !important;
  }
  .chat-msg {
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
  }
  .chat-msg--highlighted {
    background-color: #BBDEFB !important;
    box-shadow: 0 0 0 3px #90CAF9 !important;
  }
  .status-badge-transition {
    transition: background 0.4s ease, color 0.3s ease, box-shadow 0.3s ease;
  }
  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background-color: #FF8C00;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
  }
  .count-badge--bounce {
    animation: bounce 0.5s ease;
  }
  .list-fade {
    transition: opacity 0.2s ease;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #aaa;
  }
`
