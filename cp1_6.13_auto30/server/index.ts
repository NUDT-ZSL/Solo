import express from 'express'
import Datastore from 'nedb-promises'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const dbDir = path.join(__dirname, '..', 'data')
const booksDB = Datastore.create({ filename: path.join(dbDir, 'books.db'), autoload: true })
const reviewsDB = Datastore.create({ filename: path.join(dbDir, 'reviews.db'), autoload: true })
const borrowHistoryDB = Datastore.create({ filename: path.join(dbDir, 'borrowHistory.db'), autoload: true })

async function seedSampleData() {
  const count = await booksDB.count({})
  if (count === 0) {
    const sampleBooks = [
      { title: '活着', author: '余华', isbn: '9787506365437', category: '文学', donor: '张先生',入库Date: '2024-01-15', status: '在馆', borrowCount: 5 },
      { title: '三体', author: '刘慈欣', isbn: '9787536692930', category: '科普', donor: '李女士',入库Date: '2024-02-10', status: '已借出', borrowCount: 12 },
      { title: '小王子', author: '圣埃克苏佩里', isbn: '9787020042494', category: '少儿', donor: '王同学',入库Date: '2024-03-05', status: '在馆', borrowCount: 8 },
      { title: '明朝那些事儿', author: '当年明月', isbn: '9787505722460', category: '历史', donor: '赵老师',入库Date: '2024-01-20', status: '在馆', borrowCount: 15 },
      { title: '平凡的世界', author: '路遥', isbn: '9787530212637', category: '文学', donor: '孙先生',入库Date: '2024-02-28', status: '已借出', borrowCount: 20 },
    ]
    for (const book of sampleBooks) {
      await booksDB.insert({
        _id: uuidv4(),
        ...book,
        createdAt: new Date().toISOString()
      })
    }
    const books = await booksDB.find({})
    const sampleReviews = [
      { bookId: books[0]._id, rating: 5, comment: '非常感人的一本书，余华的文字直击人心。', reviewer: 'test_user' },
      { bookId: books[0]._id, rating: 4, comment: '故事很真实，让人思考生命的意义。', reviewer: 'reader_01' },
      { bookId: books[1]._id, rating: 5, comment: '科幻小说的巅峰之作，强烈推荐！', reviewer: 'test_user' },
      { bookId: books[3]._id, rating: 5, comment: '用幽默的笔调写严肃的历史，非常好看。', reviewer: 'history_fan' },
    ]
    for (const review of sampleReviews) {
      await reviewsDB.insert({
        _id: uuidv4(),
        ...review,
        createdAt: new Date().toISOString()
      })
    }
    console.log('Sample data seeded')
  }
}
seedSampleData()

app.get('/api/books', async (req, res) => {
  try {
    const { keyword, category } = req.query
    let query: any = {}
    if (keyword && typeof keyword === 'string') {
      const regex = new RegExp(keyword, 'i')
      query.$or = [
        { title: regex },
        { author: regex },
        { isbn: regex }
      ]
    }
    if (category && typeof category === 'string' && category !== '全部') {
      query.category = category
    }
    const books = await booksDB.find(query).sort({ createdAt: -1 })
    res.json(books)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await booksDB.findOne({ _id: req.params.id })
    if (!book) {
      return res.status(404).json({ error: '图书不存在' })
    }
    res.json(book)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/books', async (req, res) => {
  try {
    const { title, author, isbn, category, donor,入库Date } = req.body
    if (!title || !author || !isbn || !category || !donor || !入库Date) {
      return res.status(400).json({ error: '所有字段都是必填项' })
    }
    if (!/^\d{13}$/.test(isbn)) {
      return res.status(400).json({ error: 'ISBN格式必须为13位数字' })
    }
    const newBook = {
      _id: uuidv4(),
      title,
      author,
      isbn,
      category,
      donor,
     入库Date,
      status: '在馆',
      borrowCount: 0,
      createdAt: new Date().toISOString()
    }
    const inserted = await booksDB.insert(newBook)
    res.json(inserted)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/books/:id/reviews', async (req, res) => {
  try {
    const reviews = await reviewsDB.find({ bookId: req.params.id }).sort({ createdAt: -1 })
    res.json(reviews)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/reviews', async (req, res) => {
  try {
    const { bookId, rating, comment } = req.body
    if (!bookId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '请提供有效的评分' })
    }
    const book = await booksDB.findOne({ _id: bookId })
    if (!book) {
      return res.status(404).json({ error: '图书不存在' })
    }
    const newReview = {
      _id: uuidv4(),
      bookId,
      rating,
      comment: comment || '',
      reviewer: 'test_user',
      createdAt: new Date().toISOString()
    }
    const inserted = await reviewsDB.insert(newReview)
    res.json(inserted)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/borrow', async (req, res) => {
  try {
    const { bookId } = req.body
    const book = await booksDB.findOne({ _id: bookId })
    if (!book) {
      return res.status(404).json({ error: '图书不存在' })
    }
    if (book.status !== '在馆') {
      return res.status(400).json({ error: '图书当前不在馆，无法借阅' })
    }
    await booksDB.update({ _id: bookId }, { $set: { status: '已借出', borrowCount: (book.borrowCount || 0) + 1 } })
    await borrowHistoryDB.insert({
      _id: uuidv4(),
      bookId,
      borrower: 'test_user',
      borrowDate: new Date().toISOString(),
      returnDate: null
    })
    const updatedBook = await booksDB.findOne({ _id: bookId })
    res.json({ success: true, book: updatedBook })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/return', async (req, res) => {
  try {
    const { bookId } = req.body
    const book = await booksDB.findOne({ _id: bookId })
    if (!book) {
      return res.status(404).json({ error: '图书不存在' })
    }
    if (book.status !== '已借出') {
      return res.status(400).json({ error: '图书未被借出，无法归还' })
    }
    await booksDB.update({ _id: bookId }, { $set: { status: '在馆' } })
    await borrowHistoryDB.update(
      { bookId, returnDate: null },
      { $set: { returnDate: new Date().toISOString() } },
      { multi: false }
    )
    const updatedBook = await booksDB.findOne({ _id: bookId })
    res.json({ success: true, book: updatedBook })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/stats', async (req, res) => {
  try {
    const totalBooks = await booksDB.count({})
    const totalReviews = await reviewsDB.count({})
    const availableBooks = await booksDB.count({ status: '在馆' })
    const borrowedBooks = await booksDB.count({ status: '已借出' })
    res.json({
      totalBooks,
      totalReviews,
      availableBooks,
      borrowedBooks
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`BookBridge server running on http://localhost:${PORT}`)
})
