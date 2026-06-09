import { AcousticPhysics, ERA_CONFIGS } from './physics'
import { TheaterScene } from './scene'
import { TheaterUI } from './ui'

const physics = new AcousticPhysics()
physics.setAbsorption(ERA_CONFIGS[-300].absorption)

const scene = new TheaterScene('scene-container', physics)
const ui = new TheaterUI()
ui.setScene(scene)

scene.setRT60Callback((rt60) => ui.setRT60(rt60))
scene.setPlayStateCallback((playing) => ui.setPlaying(playing))

scene.start()
