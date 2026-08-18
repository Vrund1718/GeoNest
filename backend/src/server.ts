import app from './app';
import { config } from './config';
import { connectDB } from './config/db';

const start = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    console.log(`Frontend origin: ${config.frontendOrigin}`);
  });
};

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
