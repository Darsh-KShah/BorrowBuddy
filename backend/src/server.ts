import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config.js';

const start = async () => {
  if (config.mongoUri) await mongoose.connect(config.mongoUri);
  app.listen(config.port, config.host, () => console.log(`BorrowBuddy API listening on http://${config.host}:${config.port}`));
};
start().catch((error) => { console.error('Unable to start BorrowBuddy API', error); process.exitCode = 1; });
