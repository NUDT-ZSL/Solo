import { Router, type Request, type Response } from 'express';
import { registerUser, loginUser, getUserById, getAllUsers } from './userService';

const router = Router();

router.post('/register', (req: Request, res: Response): void => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }

    const { user, token } = registerUser(username, password, role || 'reader');
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }

    const { user, token } = loginUser(username, password);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    res.status(401).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const user = getUserById(req.params.id);

    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    const { password: _, token: __, ...userWithoutSensitive } = user;

    res.json({ success: true, user: userWithoutSensitive });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', (_req: Request, res: Response): void => {
  try {
    const users = getAllUsers().map(({ password, token, ...rest }) => rest);
    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
