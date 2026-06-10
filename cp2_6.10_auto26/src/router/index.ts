import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
    meta: {
      title: '练习中心',
      showNav: true
    }
  },
  {
    path: '/exercise',
    name: 'Exercise',
    component: () => import('@/pages/ExercisePage.vue'),
    meta: {
      title: '在线答题',
      showNav: true
    }
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('@/pages/ReviewPage.vue'),
    meta: {
      title: '错题重做',
      showNav: true
    }
  },
  {
    path: '/manage',
    name: 'Manage',
    component: () => import('@/pages/ManagePage.vue'),
    meta: {
      title: '题目管理',
      showNav: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0, behavior: 'smooth' };
  }
});

router.beforeEach((to, _from, next) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 智能练习评测系统`;
  }
  next();
});

export default router;
