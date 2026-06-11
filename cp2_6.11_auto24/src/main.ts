import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
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
  template: '<router-view />'
})

app.use(router)
app.mount('#app')
