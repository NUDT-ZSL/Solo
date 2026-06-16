import type { Event, Participant } from '../types'

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const formatCSVValue = (value: string | number | boolean | undefined): string => {
  if (value === undefined || value === null) return ''
  const strValue = String(value)
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`
  }
  return strValue
}

export function exportToCSV(event: Event) {
  const headers = ['报名时间', '姓名', '联系电话', '是否签到', '签到时间']
  
  const rows = event.participants.map((participant: Participant) => [
    formatDateTime(participant.registeredAt),
    participant.name,
    participant.phone,
    participant.checkedIn ? '是' : '否',
    participant.checkedInAt ? formatDateTime(participant.checkedInAt) : ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(formatCSVValue).join(','))
  ].join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${event.title}_${event.date}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
