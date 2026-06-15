export function validateLetter(req, res, next) {
  const { title, content, unlockAt } = req.body;
  const errors = [];
  if (!title || title.trim().length === 0) {
    errors.push('标题不能为空');
  }
  if (!content || content.trim().length === 0) {
    errors.push('内容不能为空');
  }
  if (!unlockAt) {
    errors.push('解锁时间不能为空');
  } else if (new Date(unlockAt) <= new Date()) {
    errors.push('解锁时间必须在未来');
  }
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('；') });
  }
  next();
}

export function validateComment(req, res, next) {
  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  next();
}
