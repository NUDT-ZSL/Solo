import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGardenStore } from '@/store/gardenStore'
import {
  getHarvestCountdown,
  getWaterCooldown,
  formatCooldown,
  getRegionStatus,
} from '@/utils/gardenLogic'
import { MapPin, Droplets, Clock, Leaf } from 'lucide-react'
import type { Garden, Region } from '@/types/garden'

const CROP_EMOJI: Record<string, string> = {
  番茄: '🍅',
  黄瓜: '🥒',
  胡萝卜: '🥕',
  生菜: '🥬',
  茄子: '🍆',
  辣椒: '🌶️',
}

const DAYS_AGO_MAP = [25, 40, 15, 28, 55, 35]

function getPlantDate(region: Region): string {
  const regionIndex = parseInt(region.id.replace('r', '')) - 1
  const daysAgo = DAYS_AGO_MAP[regionIndex] ?? 30
  return new Date(Date.now() - daysAgo * 86400000).toISOString()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const STATUS_BG: Record<string, string> = {
  normal: '#C8E6C9',
  nearHarvest: '#FFF9C4',
  needsWater: '#FFCDD2',
}

function getReadableTextColor(bgHex: string): string {
  const hex = bgHex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#2E2E2E' : '#FFFFFF'
}

export default function GardenDashboard() {
  const navigate = useNavigate()
  const user = useGardenStore((s) => s.user)
  const gardens = useGardenStore((s) => s.gardens)
  const setGardens = useGardenStore((s) => s.setGardens)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetch('/api/gardens')
      .then((res) => res.json())
      .then((data) => {
        setGardens(data)
      })
      .finally(() => setLoading(false))
  }, [user, navigate, setGardens])

  if (!user) return null

  const allRegions = gardens.flatMap((g: Garden) => g.regions)

  return (
    <div
      className="min-h-screen bg-garden-bg"
      style={{ paddingTop: 80 }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-8">
          <MapPin className="w-7 h-7 text-garden-title" />
          <h1 className="text-2xl font-bold text-garden-title">菜园概览</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Leaf className="w-8 h-8 text-garden-border animate-pulse" />
            <span className="ml-2 text-garden-text">加载中...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allRegions.map((region: Region) => {
              const plantDate = getPlantDate(region)
              const harvestDate = new Date(
                new Date(plantDate).getTime() + region.growDays * 86400000,
              ).toISOString()
              const countdown = getHarvestCountdown(plantDate, region.crop)
              const cooldown = getWaterCooldown(region.lastWateredAt)
              const status = getRegionStatus(region.lastWateredAt, harvestDate)
              const emoji = CROP_EMOJI[region.crop] ?? ''
              const bgColor = STATUS_BG[status]
              const textColor = getReadableTextColor(bgColor)

              return (
                <div
                  key={region.id}
                  onClick={() => navigate(`/region/${region.id}`)}
                  className="rounded-[12px] p-5 cursor-pointer"
                  style={{
                    backgroundColor: bgColor,
                    boxShadow: '4px 4px 12px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    color: textColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = '2px solid #66BB6A'
                    e.currentTarget.style.transform = 'translateY(-6px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = ''
                    e.currentTarget.style.transform = ''
                  }}
                >
                  <h2 className="text-lg font-bold mb-3" style={{ color: textColor }}>
                    {region.name}
                  </h2>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4" style={{ color: textColor }} />
                      <span>
                        {region.crop}
                        {emoji}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: textColor }} />
                      <span>种植日期：{formatDate(plantDate)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: textColor }} />
                      <span>预计收获：{formatDate(harvestDate)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 text-center text-base">🌾</span>
                      <span>
                        {countdown.days}天{countdown.hours}小时后收获
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Droplets
                        className="w-4 h-4"
                        style={{ color: cooldown > 0 ? '#C62828' : '#0D47A1' }}
                      />
                      <span>
                        {cooldown > 0 ? formatCooldown(cooldown) : '可以浇水'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
