import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.envelope}>✉️</div>
        <h1 className={styles.code}>404</h1>
        <p className={styles.message}>这封信似乎迷失在时光里了...</p>
        <p className={styles.subMessage}>找不到你要的页面</p>
        <Link to="/" className={styles.homeBtn}>
          返回首页
        </Link>
      </div>
    </div>
  );
}
