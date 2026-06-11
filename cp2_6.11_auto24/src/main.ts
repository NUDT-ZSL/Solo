import { createApp, h } from 'vue'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import RecipeFlow from './components/RecipeFlow.vue'
import type { App } from 'vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: RecipeFlow
    }
  ]
})

const app: App = createApp({
  render() {
    return h(RouterView)
  }
})

app.use(router)
app.mount('#app')
