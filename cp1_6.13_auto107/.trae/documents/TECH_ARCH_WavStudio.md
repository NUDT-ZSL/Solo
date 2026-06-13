
## 1. 架构设计

```mermaid
flowchart TB
    subgraph "浏览器层"
        A["React 18 UI 层"]
        B["Web Audio API 音频引擎"]
        C["Three.js / raw WebGL 可视化层"]
    end
    subgraph "状态层"
        D["Zustand Store"]
        E["localStorage