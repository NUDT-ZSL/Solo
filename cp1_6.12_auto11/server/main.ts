import express from 'express';
import cors from 'cors';
import routes from './routes';
import { getDbReady } from './db';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

async function start() {
  try {
    await getDbReady();
    app.listen(PORT, () => {
      console.log(`Wiki server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
