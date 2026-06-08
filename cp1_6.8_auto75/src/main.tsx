import React from 'react'
import ReactDOM from 'react-dom/client'
import { SceneManager } from './main'
import UIPanel from './UIPanel'

const threeContainer = document.getElementById('three-container')!
const uiRoot = document.getElementById('ui-root')!

const sceneManager = new SceneManager(threeContainer)

const sceneManagerRef = { current: sceneManager }

const root = ReactDOM.createRoot(uiRoot)
root.render(
  <React.StrictMode>
    <UIPanel sceneManager={sceneManagerRef} />
  </React.StrictMode>
)
