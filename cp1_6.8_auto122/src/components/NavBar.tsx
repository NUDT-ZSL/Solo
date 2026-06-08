import { useMoodStore } from '../store'

export default function NavBar() {
  const { openForm } = useMoodStore()

  return (
    <nav className="nav-bar">
      <div className="flex items-center gap-3">
        <div className="cloud-icon" aria-hidden="true">
          <div className="cloud-body" />
          <div className="cloud-puff-1" />
          <div className="cloud-puff-2" />
        </div>
        <h1 className="text-lg font-semibold text-white tracking-wide">
          情绪气象站
        </h1>
      </div>
      <button
        onClick={() => openForm()}
        className="add-mood-btn"
      >
        <span className="text-base">+</span>
        <span className="text-sm">添加心情</span>
      </button>
    </nav>
  )
}
