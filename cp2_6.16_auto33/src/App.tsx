import { useState, useCallback } from 'react'
import Timeline from './Timeline'
import PhotoCard from './PhotoCard'
import Modal from './Modal'

interface Photo {
  id: number
  year: number
  date: string
  location: string
  imageUrl: string
}

const MOCK_PHOTOS: Photo[] = [
  { id: 1, year: 2019, date: '2019-03-15', location: '巴黎·埃菲尔铁塔', imageUrl: 'https://picsum.photos/seed/1/600/400' },
  { id: 2, year: 2019, date: '2019-05-22', location: '伦敦·大本钟', imageUrl: 'https://picsum.photos/seed/2/600/400' },
  { id: 3, year: 2019, date: '2019-07-10', location: '罗马·斗兽场', imageUrl: 'https://picsum.photos/seed/3/600/400' },
  { id: 4, year: 2020, date: '2020-01-08', location: '东京·浅草寺', imageUrl: 'https://picsum.photos/seed/4/600/400' },
  { id: 5, year: 2020, date: '2020-04-18', location: '京都·金阁寺', imageUrl: 'https://picsum.photos/seed/5/600/400' },
  { id: 6, year: 2020, date: '2020-09-05', location: '首尔·景福宫', imageUrl: 'https://picsum.photos/seed/6/600/400' },
  { id: 7, year: 2020, date: '2020-11-20', location: '曼谷·大皇宫', imageUrl: 'https://picsum.photos/seed/7/600/400' },
  { id: 8, year: 2021, date: '2021-02-14', location: '悉尼·歌剧院', imageUrl: 'https://picsum.photos/seed/8/600/400' },
  { id: 9, year: 2021, date: '2021-06-30', location: '墨尔本·大洋路', imageUrl: 'https://picsum.photos/seed/9/600/400' },
  { id: 10, year: 2021, date: '2021-08-25', location: '奥克兰·天空塔', imageUrl: 'https://picsum.photos/seed/10/600/400' },
  { id: 11, year: 2022, date: '2022-03-12', location: '纽约·自由女神像', imageUrl: 'https://picsum.photos/seed/11/600/400' },
  { id: 12, year: 2022, date: '2022-05-28', location: '旧金山·金门大桥', imageUrl: 'https://picsum.photos/seed/12/600/400' },
  { id: 13, year: 2022, date: '2022-07-04', location: '洛杉矶·好莱坞', imageUrl: 'https://picsum.photos/seed/13/600/400' },
  { id: 14, year: 2022, date: '2022-10-15', location: '温哥华·史丹利公园', imageUrl: 'https://picsum.photos/seed/14/600/400' },
  { id: 15, year: 2023, date: '2023-01-22', location: '北京·故宫', imageUrl: 'https://picsum.photos/seed/15/600/400' },
  { id: 16, year: 2023, date: '2023-04-08', location: '上海·外滩', imageUrl: 'https://picsum.photos/seed/16/600/400' },
  { id: 17, year: 2023, date: '2023-06-18', location: '成都·宽窄巷子', imageUrl: 'https://picsum.photos/seed/17/600/400' },
  { id: 18, year: 2024, date: '2024-02-10', location: '迪拜·哈利法塔', imageUrl: 'https://picsum.photos/seed/18/600/400' },
  { id: 19, year: 2024, date: '2024-05-15', location: '伊斯坦布尔·蓝色清真寺', imageUrl: 'https://picsum.photos/seed/19/600/400' },
  { id: 20, year: 2024, date: '2024-09-03', location: '开罗·金字塔', imageUrl: 'https://picsum.photos/seed/20/600/400' },
]

const years = [...new Set(MOCK_PHOTOS.map(p => p.year))].sort()

function App() {
  const [selectedYear, setSelectedYear] = useState<number>(years[0])
  const [transitioning, setTransitioning] = useState(false)
  const [modalIndex, setModalIndex] = useState<number | null>(null)

  const filteredPhotos = MOCK_PHOTOS.filter(p => p.year === selectedYear)

  const handleYearChange = useCallback((year: number) => {
    if (year === selectedYear) return
    setTransitioning(true)
    setTimeout(() => {
      setSelectedYear(year)
      setTransitioning(false)
    }, 200)
  }, [selectedYear])

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value)
    handleYearChange(year)
  }, [handleYearChange])

  const handlePhotoClick = useCallback((index: number) => {
    setModalIndex(index)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalIndex(null)
  }, [])

  const handlePrev = useCallback(() => {
    setModalIndex(prev => prev !== null ? (prev - 1 + filteredPhotos.length) % filteredPhotos.length : null)
  }, [filteredPhotos.length])

  const handleNext = useCallback(() => {
    setModalIndex(prev => prev !== null ? (prev + 1) % filteredPhotos.length : null)
  }, [filteredPhotos.length])

  return (
    <>
      <nav className="navbar">
        <select
          className="navbar-select"
          value={selectedYear}
          onChange={handleSelectChange}
          aria-label="选择年份"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <h1 className="navbar-title">足迹时光轴</h1>
      </nav>
      <main className="main-content">
        <Timeline
          years={years}
          selectedYear={selectedYear}
          onYearSelect={handleYearChange}
        />
        <div className={`photo-grid${transitioning ? ' transitioning' : ''}`}>
          {filteredPhotos.map((photo, idx) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={idx}
              onClick={handlePhotoClick}
            />
          ))}
        </div>
      </main>
      {modalIndex !== null && (
        <Modal
          photos={filteredPhotos}
          currentIndex={modalIndex}
          onClose={handleCloseModal}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  )
}

export default App
