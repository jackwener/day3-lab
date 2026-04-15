import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { routes } from './routes';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(requestLogger);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(errorHandler);

export { app };
