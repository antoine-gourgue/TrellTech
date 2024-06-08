import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from "@/views/LoginView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth/trello/callback',
      name: 'homeboard',
      component: HomeView // Assurez-vous d'avoir une vue pour gérer la redirection et le stockage du token
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true } // Utilisez meta pour indiquer les routes nécessitant une authentification
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },

  ]
});


router.beforeEach((to, from, next) => {
  const publicRoutes = ['/login', '/register'];
  const authRequired = !publicRoutes.includes(to.path);
  const localStorageToken = localStorage.getItem('token');

  if (authRequired && localStorageToken) {
    return next();
  }

  if (authRequired && !localStorageToken) {
    return next({ name: 'login' });
  }

  next();
});

export default router;

