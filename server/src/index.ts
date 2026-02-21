import express from 'express';
import cors from 'cors';
import path from 'path';
import { CONFIG } from './config';
import { getDb } from './db/connection';
import { errorHandler } from './middleware/errorHandler';
import { startPollCreatorJob } from './jobs/pollCreator';

import playersRouter from './routes/players';
import pollsRouter from './routes/polls';
import votesRouter from './routes/votes';
import scheduleRouter from './routes/schedule';
import adminRouter from './routes/admin';
import archiveRouter from './routes/archive';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : CONFIG.PORT;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/players', playersRouter);
app.use('/api/polls', pollsRouter);
app.use('/api/votes', votesRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/admin', adminRouter);
app.use('/api/archive', archiveRouter);

// Serve static client in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

// Initialize DB
getDb();
console.log('Database initialized');

// Start cron jobs
startPollCreatorJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
