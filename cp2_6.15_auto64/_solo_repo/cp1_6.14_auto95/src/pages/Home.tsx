import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRecipes } from '../http'
import type { Recipe } from '../types'

function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRecipes()
        setRecipes(data)
      } catch (e) {
        console.error('加载菜谱失败', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const headerHeight = 200

  return (
    <div>
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>发现你的美味珍藏</h1>
        <p style={styles.heroSubtitle}>智能配料换算 · 烹饪计时器 · 让每一次下厨都轻松自在</p>
      </div>

      {loading ? (
        <div style={styles.loading}>加载中...</div>
      ) : (
        <div style={styles.masonry}>
          {recipes.map((r) => (
            <Link
              key={r.id}
              to={`/recipe/${r.id}`}
              style={styles.card}
              className="recipe-card"
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-4px)'
                el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'
              }}
            >
              <div style={styles.imageBox}>
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt={r.name} style={styles.image} />
                ) : (
                  <div style={styles.imagePlaceholder}>
                    <span style={styles.placeholderEmoji}>🍽️</span>
                  </div>
                )}
              </div>
              <div style={{ padding: '16px 20px 20px' }}>
                <h3 style={styles.cardTitle}>{r.name}</h3>
                <p style={styles.cardDesc}>{r.description}</p>
                <div style={styles.tagRow}>
                  {r.tags.map((t, i) => (
                    <span key={i} style={styles.tag}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    textAlign: 'center',
    padding: '32px 0 48px',
  },
  heroTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 42,
    fontWeight: 700,
    color: '#2d2a24',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#8d7b68',
    letterSpacing: 0.5,
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: '#8d7b68',
    fontSize: 16,
  },
  masonry: {
    columnCount: 3,
    columnGap: 24,
  },
  card: {
    display: 'block',
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease-out',
    breakInside: 'avoid',
    marginBottom: 24,
    overflow: 'hidden',
  },
  imageBox: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0ebe1',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 60,
  },
  cardTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 20,
    color: '#2d2a24',
    fontWeight: 600,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#7a7368',
    lineHeight: 1.6,
    marginBottom: 12,
    minHeight: 44,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    display: 'inline-block',
    borderRadius: 16,
    backgroundColor: '#e8e2d9',
    padding: '4px 12px',
    fontSize: 12,
    color: '#8d7b68',
    fontWeight: 500,
  },
}

export default Home
