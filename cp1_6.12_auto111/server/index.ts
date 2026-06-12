import express from 'express';
import cors from 'cors';
import { dialogController, historyController } from './controller/dialogController.ts';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/dialogs/:panelId', dialogController.getDialogsByPanel);
app.post('/api/dialogs', dialogController.createDialog);
app.put('/api/dialogs/:id', dialogController.updateDialog);
app.delete('/api/dialogs/:id', dialogController.deleteDialog);

app.get('/api/history/panel/:panelId', historyController.getHistoryByPanel);
app.get('/api/history/dialog/:dialogId', historyController.getHistoryByDialog);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
