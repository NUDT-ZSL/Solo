import { eventBus } from './src/eventBus'
import { JSDOM } from 'jsdom'

if (typeof document === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  global.document = dom.window.document
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement as any
}

console.log('=== GalleryWalk 功能测试断言 (不依赖DOM部分) ===\n')

let testsPassed = 0
let testsFailed = 0

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    console.log(`\u2713 PASS: ${testName}`)
    if (detail) console.log(`  ${detail}`)
    testsPassed++
  } else {
    console.log(`\u2717 FAIL: ${testName}`)
    if (detail) console.log(`  ${detail}`)
    testsFailed++
  }
}

async function runTests() {
  console.log('--- 1. 事件总线测试 ---')

  let eventFired = false
  let eventPayload: any = null
  const testHandler = (payload: any) => {
    eventFired = true
    eventPayload = payload
  }
  eventBus.on('test-event', testHandler)
  eventBus.emit('test-event', { test: 'data' })

  assert(eventFired === true,
    '事件总线emit/on',
    '事件应正确触发')
  assert(eventPayload && eventPayload.test === 'data',
    '事件总线载荷传递',
    '载荷应正确传递')

  eventBus.off('test-event', testHandler)
  eventFired = false
  eventBus.emit('test-event', { test: 'data2' })
  assert(eventFired === false,
    '事件总线off',
    '取消监听后事件不应触发')

  console.log('\n--- 2. 相机控制参数测试 ---')

  const interactionModule = await import('./src/interactionController')
  const {
    MIN_POLAR, MAX_POLAR, ZOOM_SPEED, MIN_ZOOM, MAX_ZOOM, DAMPING,
    ROTATION_SPEED
  } = interactionModule

  assert(MIN_POLAR === -15 * Math.PI / 180,
    '垂直旋转最小角度',
    `应为-15度(-0.2618rad)，实际${MIN_POLAR}rad`)
  assert(MAX_POLAR === 60 * Math.PI / 180,
    '垂直旋转最大角度',
    `应为60度(1.0472rad)，实际${MAX_POLAR}rad`)
  assert(ZOOM_SPEED === 0.1,
    '滚轮缩放速度',
    `应为0.1，实际${ZOOM_SPEED}`)
  assert(MIN_ZOOM === 1,
    '最小缩放距离',
    `应为1，实际${MIN_ZOOM}`)
  assert(MAX_ZOOM === 10,
    '最大缩放距离',
    `应为10，实际${MAX_ZOOM}`)
  assert(DAMPING === 0.9,
    '旋转阻尼',
    `应为0.9，实际${DAMPING}`)
  assert(ROTATION_SPEED === 0.003,
    '旋转速度',
    `应为0.003，实际${ROTATION_SPEED}`)

  console.log('\n--- 3. 画廊场景常量测试 ---')

  const galleryModule = await import('./src/galleryScene')
  const {
    FRAME_WIDTH, FRAME_HEIGHT, FRAME_BORDER, FRAME_COLOR, FRAME_HIGHLIGHT_COLOR,
    WALL_COLOR, FLOOR_COLOR, ROOM_WIDTH, ROOM_LENGTH, ROOM_HEIGHT,
    FRAMES_PER_WALL, FRAME_SPACING, CAMERA_HEIGHT, WALL_THICKNESS
  } = galleryModule

  assert(FRAME_WIDTH === 2,
    '画框宽度',
    `应为2，实际${FRAME_WIDTH}`)
  assert(FRAME_HEIGHT === 1.5,
    '画框高度',
    `应为1.5，实际${FRAME_HEIGHT}`)
  assert(FRAME_BORDER === 0.05,
    '画框边框厚度',
    `应为0.05，实际${FRAME_BORDER}`)
  assert(FRAME_COLOR === 0x8b7355,
    '画框默认颜色',
    `应为0x8b7355，实际${FRAME_COLOR.toString(16)}`)
  assert(FRAME_HIGHLIGHT_COLOR === 0xffd700,
    '画框高亮颜色',
    `应为0xffd700，实际${FRAME_HIGHLIGHT_COLOR.toString(16)}`)
  assert(WALL_COLOR === 0xf5f0e1,
    '墙壁颜色',
    `应为0xf5f0e1，实际${WALL_COLOR.toString(16)}`)
  assert(FLOOR_COLOR === 0xd4cdc0,
    '地面颜色',
    `应为0xd4cdc0，实际${FLOOR_COLOR.toString(16)}`)
  assert(ROOM_WIDTH === 12,
    '房间宽度',
    `应为12，实际${ROOM_WIDTH}`)
  assert(ROOM_LENGTH === 20,
    '房间长度',
    `应为20，实际${ROOM_LENGTH}`)
  assert(ROOM_HEIGHT === 4,
    '房间高度',
    `应为4，实际${ROOM_HEIGHT}`)
  assert(FRAMES_PER_WALL === 4,
    '每面墙画框数量',
    `应为4，实际${FRAMES_PER_WALL}`)
  assert(FRAME_SPACING === 1.5,
    '画框间距',
    `应为1.5，实际${FRAME_SPACING}`)
  assert(CAMERA_HEIGHT === 1.6,
    '相机高度',
    `应为1.6，实际${CAMERA_HEIGHT}`)
  assert(WALL_THICKNESS === 0.2,
    '墙壁厚度',
    `应为0.2，实际${WALL_THICKNESS}`)

  console.log('\n--- 4. 作品管理数据测试 ---')

  const artworkModule = await import('./src/artworkManager')
  const { SERIES_NAMES, SERIES_DATA, SERIES_PATTERN_CONFIG } = artworkModule

  assert(SERIES_NAMES.length === 3,
    '系列数量',
    `应为3，实际${SERIES_NAMES.length}`)
  assert(SERIES_NAMES[0] === '自然之韵',
    '第一个系列名称',
    `应为"自然之韵"，实际"${SERIES_NAMES[0]}"`)
  assert(SERIES_NAMES[1] === '城市印象',
    '第二个系列名称',
    `应为"城市印象"，实际"${SERIES_NAMES[1]}"`)
  assert(SERIES_NAMES[2] === '抽象梦境',
    '第三个系列名称',
    `应为"抽象梦境"，实际"${SERIES_NAMES[2]}"`)

  for (const seriesName of SERIES_NAMES) {
    const data = SERIES_DATA[seriesName]
    assert(data && data.titles.length === 8,
      `${seriesName}系列标题数量`,
      `应为8，实际${data?.titles.length}`)
    assert(data && data.descriptions.length === 8,
      `${seriesName}系列描述数量`,
      `应为8，实际${data?.descriptions.length}`)

    const config = SERIES_PATTERN_CONFIG[seriesName]
    assert(config && config.patterns.length === 8,
      `${seriesName}系列图案配置数量`,
      `应为8，实际${config?.patterns.length}`)
    assert(config && config.palette.length >= 5,
      `${seriesName}系列调色板颜色数量`,
      `应>=5，实际${config?.palette.length}`)

    for (let i = 0; i < 8; i++) {
      assert(data?.titles[i].length > 0,
        `${seriesName}作品${i + 1}标题非空`,
        `标题应不为空`)
      assert(data?.descriptions[i].length > 0 && data?.descriptions[i].length <= 200,
        `${seriesName}作品${i + 1}描述长度`,
        `应在1-200字之间，实际${data?.descriptions[i].length}字`)
    }
  }

  console.log('\n--- 5. 纹理预设图案确定性测试 ---')

  const validPatterns = ['gradient-stripes', 'concentric-circles', 'checkerboard',
    'radial-gradient', 'diagonal-lines', 'geometric-grid']

  for (const seriesName of SERIES_NAMES) {
    const config = SERIES_PATTERN_CONFIG[seriesName]
    for (let i = 0; i < 8; i++) {
      const pattern = config.patterns[i]
      assert(validPatterns.includes(pattern),
        `${seriesName}作品${i + 1}图案类型有效`,
        `图案类型"${pattern}"应属于预设类型`)
    }
  }

  console.log('\n--- 6. 画框高亮状态逻辑测试 ---')

  let highlightState: number = -1
  let focusState: number = -1

  eventBus.on('artwork-hover', (idx: number) => {
    highlightState = idx
  })
  eventBus.on('artwork-unhover', () => {
    highlightState = -1
  })
  eventBus.on('artwork-focused', (idx: number) => {
    focusState = idx
  })
  eventBus.on('artwork-unfocused', () => {
    focusState = -1
  })

  eventBus.emit('artwork-hover', 3)
  assert(highlightState === 3,
    '悬停事件状态更新',
    `悬停索引应为3，实际${highlightState}`)

  eventBus.emit('artwork-focused', 3)
  assert(focusState === 3,
    '聚焦事件状态更新',
    `聚焦索引应为3，实际${focusState}`)

  eventBus.emit('artwork-unhover')
  assert(highlightState === -1,
    '取消悬停事件状态更新',
    `悬停索引应为-1，实际${highlightState}`)
  assert(focusState === 3,
    '聚焦状态在取消悬停后保持',
    `聚焦索引应仍为3，实际${focusState}`)

  eventBus.emit('artwork-unfocused')
  assert(focusState === -1,
    '取消聚焦事件状态更新',
    `聚焦索引应为-1，实际${focusState}`)

  console.log('\n--- 7. 信息面板数据读取测试 ---')

  const { ArtworkManager } = artworkModule
  const artworkManager = new ArtworkManager()

  for (let i = 0; i < 8; i++) {
    const data = artworkManager.getArtwork(i)
    assert(data !== null,
      `作品${i}数据存在`,
      `getArtwork(${i})应返回有效数据`)
    if (data) {
      assert(typeof data.title === 'string' && data.title.length > 0,
        `作品${i}标题字段正确`,
        `标题应为非空字符串`)
      assert(typeof data.author === 'string' && data.author.length > 0,
        `作品${i}作者字段正确`,
        `作者应为非空字符串`)
      assert(typeof data.year === 'number' && data.year >= 2024,
        `作品${i}年份字段正确`,
        `年份应为>=2024的数字`)
      assert(typeof data.description === 'string' && data.description.length > 0,
        `作品${i}描述字段正确`,
        `描述应为非空字符串`)
      assert(typeof data.seriesName === 'string' && data.seriesName.length > 0,
        `作品${i}系列字段正确`,
        `系列名称应为非空字符串`)
      assert(data.imageCanvas instanceof HTMLCanvasElement,
        `作品${i}画布字段正确`,
        `imageCanvas应为HTMLCanvasElement`)
    }
  }

  const invalidData = artworkManager.getArtwork(-1)
  assert(invalidData === null,
    '无效索引返回null',
    'getArtwork(-1)应返回null')

  const invalidData2 = artworkManager.getArtwork(100)
  assert(invalidData2 === null,
    '超出范围索引返回null',
    'getArtwork(100)应返回null')

  console.log('\n--- 8. 系列切换测试 ---')

  const originalSeries = artworkManager.getCurrentSeries()
  assert(originalSeries === '自然之韵',
    '初始系列正确',
    `初始系列应为"自然之韵"，实际"${originalSeries}"`)

  eventBus.emit('series-change-request', { seriesName: '城市印象' })
  const newSeries = artworkManager.getCurrentSeries()
  assert(newSeries === '城市印象',
    '系列切换正确',
    `切换后系列应为"城市印象"，实际"${newSeries}"`)

  const dataAfterSwitch = artworkManager.getArtwork(0)
  assert(dataAfterSwitch !== null && dataAfterSwitch.seriesName === '城市印象',
    '系列切换后作品数据更新',
    `切换后作品系列应为"城市印象"，实际"${dataAfterSwitch?.seriesName}"`)

  console.log('\n=== 测试结果汇总 ===')
  console.log(`通过: ${testsPassed}`)
  console.log(`失败: ${testsFailed}`)
  console.log(`总计: ${testsPassed + testsFailed}`)

  if (testsFailed > 0) {
    console.log('\n\u274C 部分测试失败')
    process.exit(1)
  } else {
    console.log('\n\ud83c\udf89 所有测试通过！')
  }
}

runTests().catch(e => {
  console.error('测试运行出错:', e)
  process.exit(1)
})
