import express, { Request, Response } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import Tesseract from 'tesseract.js'
import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

const uploadsDir = path.join(__dirname, '../uploads')
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {})

const dbPath = path.join(__dirname, '../data/receipts.db')
const dataDir = path.dirname(dbPath)
fs.mkdir(dataDir, { recursive: true }).catch(() => {})

const db = Datastore.create({
  filename: dbPath,
  autoload: true
})

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      return cb(null, true)
    }
    cb(new Error('仅支持 JPEG/PNG 格式图片，大小不超过 5MB'))
  }
})

interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface Receipt {
  _id?: string
  merchantName: string
  purchaseDate: string
  items: ReceiptItem[]
  totalAmount: number
  category: string
  imageUrl: string
  createdAt: string
  rawText?: string
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '餐饮美食': ['餐厅', '饭店', '餐饮', '美食', '火锅', '烧烤', '奶茶', '咖啡', '星巴克', '肯德基', '麦当劳', '必胜客', '小吃', '面馆'],
  '超市购物': ['超市', '沃尔玛', '家乐福', '永辉', '大润发', '便利店', '7-11', '全家', '罗森'],
  '服饰鞋包': ['服装', '服饰', '鞋', '包', '优衣库', 'ZARA', 'H&M', '耐克', '阿迪'],
  '生活日用': ['日用品', '百货', '家居', '屈臣氏', '万宁'],
  '数码家电': ['数码', '电器', '家电', '手机', '电脑', '京东', '苏宁', '国美'],
  '交通出行': ['出租', '滴滴', '加油', '停车', '地铁', '公交', '高铁', '机票', '航空']
}

function categorizeMerchant(name: string): string {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => name.includes(kw))) {
      return category
    }
  }
  return '其他消费'
}

function parseReceiptText(text: string): Partial<Receipt> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  let merchantName = ''
  for (const line of lines.slice(0, 8)) {
    if (line.length >= 2 && line.length <= 30 && !/^\d/.test(line) && !line.includes('￥') && !line.includes('¥')) {
      if (/[店|公司|超市|餐厅|饭|馆|咖啡|茶|便利|商|场|市]/.test(line) || /^[A-Za-z\u4e00-\u9fa5]/.test(line)) {
        merchantName = line.replace(/\s+/g, ' ').substring(0, 30)
        break
      }
    }
  }
  if (!merchantName && lines.length > 0) {
    merchantName = lines[0].substring(0, 30)
  }
  if (!merchantName) merchantName = '未知商家'

  let purchaseDate = ''
  const datePatterns = [
    /(\d{4})[-\/年\.](\d{1,2})[-\/月\.](\d{1,2})/,
    /(\d{1,2})[-\/月\.](\d{1,2})[-\/日]/
  ]
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern)
      if (match) {
        if (match[1].length === 4) {
          purchaseDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
        } else {
          const year = new Date().getFullYear()
          purchaseDate = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
        }
        break
      }
    }
    if (purchaseDate) break
  }
  if (!purchaseDate) {
    purchaseDate = new Date().toISOString().split('T')[0]
  }

  const items: ReceiptItem[] = []
  const itemPatterns = [
    /^(.+?)\s+(\d+)\s*[x×*]\s*(\d+\.?\d*)\s+(\d+\.?\d*)$/,
    /^(.+?)\s+(\d+\.?\d*)\s*$/,
    /^(.+?)\s{2,}(\d+\.?\d*)$/
  ]

  for (const line of lines) {
    if (/^(合计|总计|总金额|应付|实付|应收|现金|找零|合计金额|TOTAL|Total)/.test(line)) continue
    if (/^(日期|时间|单号|发票|税号|电话|地址|收银员)/.test(line)) continue
    
    let matched = false
    
    const m1 = line.match(itemPatterns[0])
    if (m1) {
      const name = m1[1].trim()
      const quantity = parseInt(m1[2])
      const unitPrice = parseFloat(m1[3])
      const subtotal = parseFloat(m1[4])
      if (name && quantity > 0 && unitPrice >= 0 && subtotal >= 0) {
        items.push({ name, quantity, unitPrice, subtotal })
        matched = true
      }
    }

    if (!matched) {
      const priceMatch = line.match(/[￥¥]\s*(\d+\.?\d*)/) || line.match(/(\d+\.\d{2})/)
      if (priceMatch) {
        const price = parseFloat(priceMatch[1])
        const namePart = line.replace(/[￥¥]\s*\d+\.?\d*/g, '').replace(/\s{2,}/g, ' ').trim()
        if (namePart && namePart.length >= 1 && namePart.length <= 30 && price > 0 && price < 100000) {
          const exists = items.some(it => it.name === namePart)
          if (!exists) {
            items.push({
              name: namePart.substring(0, 30),
              quantity: 1,
              unitPrice: price,
              subtotal: price
            })
          }
        }
      }
    }
  }

  let totalAmount = 0
  const totalPatterns = [
    /(?:合计|总计|总金额|应付|实付|应收|TOTAL|Total)[^0-9]*[￥¥]?\s*(\d+\.?\d*)/,
    /^[￥¥]\s*(\d+\.?\d*)$/
  ]
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern)
      if (match) {
        totalAmount = parseFloat(match[1])
        break
      }
    }
    if (totalAmount > 0) break
  }
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0)
  }

  return {
    merchantName,
    purchaseDate,
    items,
    totalAmount,
    category: categorizeMerchant(merchantName),
    rawText: text
  }
}

app.post('/api/receipts/parse', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传图片' })
      return
    }

    const timestamp = Date.now()
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'
    const filename = `receipt_${timestamp}${ext}`
    const filepath = path.join(uploadsDir, filename)

    await sharp(req.file.buffer)
      .rotate()
      .resize(1200, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(filepath)

    const processedBuffer = await sharp(req.file.buffer)
      .rotate()
      .grayscale()
      .normalize()
      .resize(1600, null, { withoutEnlargement: true })
      .toBuffer()

    const { data } = await Tesseract.recognize(processedBuffer, 'chi_sim+eng', {
      logger: () => {}
    })

    const parsed = parseReceiptText(data.text)

    const receipt: Receipt = {
      merchantName: parsed.merchantName || '未知商家',
      purchaseDate: parsed.purchaseDate || new Date().toISOString().split('T')[0],
      items: parsed.items || [],
      totalAmount: parsed.totalAmount || 0,
      category: parsed.category || '其他消费',
      imageUrl: `/uploads/${filename}`,
      createdAt: new Date().toISOString(),
      rawText: parsed.rawText
    }

    const saved = await db.insert(receipt)

    res.json({
      success: true,
      data: saved
    })
  } catch (error: any) {
    console.error('Parse error:', error)
    res.status(500).json({ error: error.message || '解析失败，请重试' })
  }
})

app.get('/api/receipts', async (_req: Request, res: Response) => {
  try {
    const receipts = await db.find({}).sort({ createdAt: -1 })
    res.json({ success: true, data: receipts })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/receipts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body
    if (updates.merchantName) {
      updates.category = categorizeMerchant(updates.merchantName)
    }
    const updated = await db.update({ _id: id }, { $set: updates }, { returnUpdatedDocs: true })
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/receipts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const receipt = await db.findOne({ _id: id })
    if (receipt && receipt.imageUrl) {
      const imgPath = path.join(__dirname, '..', receipt.imageUrl)
      fs.unlink(imgPath).catch(() => {})
    }
    await db.remove({ _id: id })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/receipts/summary', async (req: Request, res: Response) => {
  try {
    const { month } = req.query as { month?: string }
    let query: Record<string, any> = {}
    if (month) {
      query.purchaseDate = { $regex: new RegExp(`^${month}`) }
    }
    const receipts = await db.find(query)

    const categoryMap = new Map<string, number>()
    let totalAll = 0

    for (const r of receipts) {
      const cat = r.category || '其他消费'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (r.totalAmount || 0))
      totalAll += r.totalAmount || 0
    }

    const categories = Array.from(categoryMap.entries()).map(([name, amount]) => ({
      name,
      amount: Number(amount.toFixed(2)),
      percentage: totalAll > 0 ? Number(((amount / totalAll) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.amount - a.amount)

    res.json({
      success: true,
      data: {
        totalCount: receipts.length,
        totalAmount: Number(totalAll.toFixed(2)),
        categories,
        month: month || null
      }
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`ReceiptLens API server running on http://localhost:${PORT}`)
})
