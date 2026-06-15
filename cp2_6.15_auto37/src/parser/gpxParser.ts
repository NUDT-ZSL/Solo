import { XMLParser } from 'fast-xml-parser'
import type { TrailPoint } from '../store/trailStore'

export function parseGPX(gpxContent: string): TrailPoint[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
  })

  const result = parser.parse(gpxContent)
  const points: TrailPoint[] = []

  const trk = result.gpx?.trk
  if (!trk) return points

  let trkpts: any[] = []

  if (Array.isArray(trk)) {
    for (const track of trk) {
      const trkseg = track.trkseg
      if (Array.isArray(trkseg)) {
        for (const seg of trkseg) {
          if (seg.trkpt) {
            trkpts = trkpts.concat(Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt])
          }
        }
      } else if (trkseg?.trkpt) {
        trkpts = trkpts.concat(Array.isArray(trkseg.trkpt) ? trkseg.trkpt : [trkseg.trkpt])
      }
    }
  } else {
    const trkseg = trk.trkseg
    if (Array.isArray(trkseg)) {
      for (const seg of trkseg) {
        if (seg.trkpt) {
          trkpts = trkpts.concat(Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt])
        }
      }
    } else if (trkseg?.trkpt) {
      trkpts = Array.isArray(trkseg.trkpt) ? trkseg.trkpt : [trkseg.trkpt]
    }
  }

  for (const pt of trkpts) {
    const lat = parseFloat(pt['@_lat'])
    const lon = parseFloat(pt['@_lon'])
    const ele = pt.ele !== undefined ? parseFloat(pt.ele) : 0
    const timeStr = pt.time || pt['@_time']
    const time = timeStr ? new Date(timeStr).getTime() : 0

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ lat, lon, ele, time })
    }
  }

  if (points.length > 0 && points[0].time === 0) {
    for (let i = 0; i < points.length; i++) {
      points[i].time = i * 1000
    }
  }

  return points
}
