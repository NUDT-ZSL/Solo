import Datastore from 'nedb-promises'

const stores = Datastore.create({ filename: './data/stores.db', autoload: true })
const appointments = Datastore.create({ filename: './data/appointments.db', autoload: true })
const members = Datastore.create({ filename: './data/members.db', autoload: true })
const rooms = Datastore.create({ filename: './data/rooms.db', autoload: true })

async function seedData() {
  const storeCount = await stores.count({})
  if (storeCount > 0) return

  await stores.insert([
    { _id: 'store-1', name: '汪星总店', address: '幸福路88号', phone: '010-88880001', hours: '09:00-21:00' },
    { _id: 'store-2', name: '喵星分店', address: '阳光大道66号', phone: '010-88880002', hours: '09:00-21:00' },
    { _id: 'store-3', name: '萌宠分店', address: '宠物街12号', phone: '010-88880003', hours: '09:00-21:00' },
  ])

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10)
  const threeDaysAgo = new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10)
  const fourDaysAgo = new Date(Date.now() - 86400000 * 4).toISOString().slice(0, 10)
  const fiveDaysAgo = new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10)
  const sixDaysAgo = new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10)

  await appointments.insert([
    { storeId: 'store-1', date: today, time: '09:00', service: '洗澡', petName: '豆豆', petBreed: '金毛', petWeight: '28kg', ownerPhone: '13800001111', ownerName: '张先生', groomerId: 'groomer-1', status: 'pending', price: 120, rating: null, review: null, _id: 'apt-001' },
    { storeId: 'store-1', date: today, time: '10:00', service: '剪毛', petName: '咪咪', petBreed: '英短', petWeight: '4.5kg', ownerPhone: '13800002222', ownerName: '李女士', groomerId: 'groomer-1', status: 'pending', price: 180, rating: null, review: null, _id: 'apt-002' },
    { storeId: 'store-1', date: today, time: '11:00', service: 'SPA', petName: '球球', petBreed: '泰迪', petWeight: '5kg', ownerPhone: '13800003333', ownerName: '王先生', groomerId: 'groomer-2', status: 'pending', price: 260, rating: null, review: null, _id: 'apt-003' },
    { storeId: 'store-2', date: today, time: '09:00', service: '洗澡', petName: '旺财', petBreed: '柯基', petWeight: '12kg', ownerPhone: '13800004444', ownerName: '赵女士', groomerId: 'groomer-3', status: 'pending', price: 100, rating: null, review: null, _id: 'apt-004' },
    { storeId: 'store-2', date: today, time: '14:00', service: '剪毛', petName: '小白', petBreed: '比熊', petWeight: '6kg', ownerPhone: '13800005555', ownerName: '陈先生', groomerId: 'groomer-3', status: 'pending', price: 200, rating: null, review: null, _id: 'apt-005' },
    { storeId: 'store-1', date: yesterday, time: '10:00', service: '洗澡', petName: '大毛', petBreed: '萨摩耶', petWeight: '22kg', ownerPhone: '13800006666', ownerName: '刘女士', groomerId: 'groomer-1', status: 'completed', price: 150, rating: 5, review: '洗得很干净，狗狗很喜欢', _id: 'apt-006' },
    { storeId: 'store-2', date: yesterday, time: '11:00', service: 'SPA', petName: '花花', petBreed: '布偶猫', petWeight: '5kg', ownerPhone: '13800007777', ownerName: '黄先生', groomerId: 'groomer-3', status: 'completed', price: 280, rating: 4, review: '服务不错，下次还来', _id: 'apt-007' },
    { storeId: 'store-1', date: twoDaysAgo, time: '09:00', service: '剪毛', petName: '阿福', petBreed: '拉布拉多', petWeight: '30kg', ownerPhone: '13800008888', ownerName: '周先生', groomerId: 'groomer-2', status: 'completed', price: 200, rating: 5, review: '手艺很好', _id: 'apt-008' },
    { storeId: 'store-3', date: twoDaysAgo, time: '15:00', service: '洗澡', petName: '奶茶', petBreed: '英短', petWeight: '4kg', ownerPhone: '13800009999', ownerName: '吴女士', groomerId: 'groomer-4', status: 'completed', price: 100, rating: 4, review: '猫咪很配合', _id: 'apt-009' },
    { storeId: 'store-1', date: threeDaysAgo, time: '14:00', service: 'SPA', petName: '可乐', petBreed: '博美', petWeight: '3kg', ownerPhone: '13800010000', ownerName: '孙先生', groomerId: 'groomer-1', status: 'completed', price: 240, rating: 3, review: '还行吧', _id: 'apt-010' },
    { storeId: 'store-2', date: threeDaysAgo, time: '10:00', service: '洗澡', petName: '小黑', petBreed: '德牧', petWeight: '35kg', ownerPhone: '13800011111', ownerName: '郑先生', groomerId: 'groomer-3', status: 'completed', price: 160, rating: 5, review: '非常专业', _id: 'apt-011' },
    { storeId: 'store-3', date: fourDaysAgo, time: '11:00', service: '剪毛', petName: '雪球', petBreed: '贵宾', petWeight: '4kg', ownerPhone: '13800012222', ownerName: '冯女士', groomerId: 'groomer-4', status: 'completed', price: 180, rating: 4, review: '造型很可爱', _id: 'apt-012' },
    { storeId: 'store-1', date: fiveDaysAgo, time: '09:00', service: '洗澡', petName: '大黄', petBreed: '中华田园犬', petWeight: '15kg', ownerPhone: '13800013333', ownerName: '蒋先生', groomerId: 'groomer-2', status: 'completed', price: 80, rating: 5, review: '价格实惠', _id: 'apt-013' },
    { storeId: 'store-2', date: sixDaysAgo, time: '14:00', service: 'SPA', petName: '团子', petBreed: '加菲猫', petWeight: '6kg', ownerPhone: '13800014444', ownerName: '韩女士', groomerId: 'groomer-3', status: 'completed', price: 260, rating: 4, review: '猫咪很享受', _id: 'apt-014' },
    { storeId: 'store-3', date: sixDaysAgo, time: '10:00', service: '洗澡', petName: '毛毛', petBreed: '哈士奇', petWeight: '25kg', ownerPhone: '13800015555', ownerName: '杨先生', groomerId: 'groomer-4', status: 'completed', price: 140, rating: 3, review: '还可以', _id: 'apt-015' },
  ])

  await members.insert([
    { _id: 'member-1', name: '张先生', phone: '13800001111', points: 580, storeId: 'store-1' },
    { _id: 'member-2', name: '李女士', phone: '13800002222', points: 320, storeId: 'store-1' },
    { _id: 'member-3', name: '王先生', phone: '13800003333', points: 150, storeId: 'store-1' },
    { _id: 'member-4', name: '赵女士', phone: '13800004444', points: 890, storeId: 'store-2' },
    { _id: 'member-5', name: '陈先生', phone: '13800005555', points: 210, storeId: 'store-2' },
    { _id: 'member-6', name: '刘女士', phone: '13800006666', points: 460, storeId: 'store-1' },
    { _id: 'member-7', name: '黄先生', phone: '13800007777', points: 730, storeId: 'store-2' },
    { _id: 'member-8', name: '吴女士', phone: '13800009999', points: 120, storeId: 'store-3' },
  ])

  const pointHistory = []
  const memberIdList = ['member-1', 'member-2', 'member-3', 'member-4', 'member-5', 'member-6', 'member-7', 'member-8']
  const serviceList = ['洗澡', '剪毛', 'SPA']
  for (let i = 0; i < 30; i++) {
    const mid = memberIdList[Math.floor(Math.random() * memberIdList.length)]
    const svc = serviceList[Math.floor(Math.random() * serviceList.length)]
    const d = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000)
    const pts = Math.floor(Math.random() * 5 + 1) * 10
    pointHistory.push({
      memberId: mid,
      date: d.toISOString().slice(0, 10),
      service: svc,
      points: pts,
      type: 'earn',
      _id: `ph-${String(i + 1).padStart(3, '0')}`,
    })
  }
  await members.insert(pointHistory.map(h => ({ ...h, _collection: 'pointHistory' })))

  await rooms.insert([
    { _id: 'room-1', storeId: 'store-1', name: 'A1', status: 'available', petName: null, checkInTime: null },
    { _id: 'room-2', storeId: 'store-1', name: 'A2', status: 'occupied', petName: '豆豆', checkInTime: '2026-06-12 10:00' },
    { _id: 'room-3', storeId: 'store-1', name: 'A3', status: 'cleaning', petName: null, checkInTime: null },
    { _id: 'room-4', storeId: 'store-1', name: 'B1', status: 'available', petName: null, checkInTime: null },
    { _id: 'room-5', storeId: 'store-1', name: 'B2', status: 'occupied', petName: '咪咪', checkInTime: '2026-06-11 14:30' },
    { _id: 'room-6', storeId: 'store-1', name: 'B3', status: 'available', petName: null, checkInTime: null },
    { _id: 'room-7', storeId: 'store-2', name: 'A1', status: 'occupied', petName: '旺财', checkInTime: '2026-06-12 09:00' },
    { _id: 'room-8', storeId: 'store-2', name: 'A2', status: 'cleaning', petName: null, checkInTime: null },
    { _id: 'room-9', storeId: 'store-2', name: 'A3', status: 'available', petName: null, checkInTime: null },
    { _id: 'room-10', storeId: 'store-2', name: 'B1', status: 'available', petName: null, checkInTime: null },
    { _id: 'room-11', storeId: 'store-3', name: 'A1', status: 'available', petName: null, checkInTime: null },
    { _id: 'room-12', storeId: 'store-3', name: 'A2', status: 'occupied', petName: '奶茶', checkInTime: '2026-06-13 08:00' },
    { _id: 'room-13', storeId: 'store-3', name: 'A3', status: 'cleaning', petName: null, checkInTime: null },
    { _id: 'room-14', storeId: 'store-3', name: 'B1', status: 'available', petName: null, checkInTime: null },
    { _id: 'room-15', storeId: 'store-3', name: 'B2', status: 'occupied', petName: '雪球', checkInTime: '2026-06-10 16:00' },
    { _id: 'room-16', storeId: 'store-3', name: 'B3', status: 'available', petName: null, checkInTime: null },
  ])
}

seedData().catch(console.error)

export { stores, appointments, members, rooms }
