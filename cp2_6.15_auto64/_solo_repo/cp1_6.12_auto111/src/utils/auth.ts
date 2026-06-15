import type { User } from '../types';

export const auth = {
  getCurrentUser(): User {
    const saved = localStorage.getItem('panelcanvas_user');
    if (saved) {
      return JSON.parse(saved);
    }
    const user: User = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      name: '创作者' + Math.floor(Math.random() * 1000)
    };
    localStorage.setItem('panelcanvas_user', JSON.stringify(user));
    return user;
  }
};
