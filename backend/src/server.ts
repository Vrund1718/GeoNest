import app from './app';
import { config } from './config';
import { connectDB } from './config/db';
import { isTwilioConfigured } from './utils/twilioClient';

const start = async () => {
  await connectDB();

  const twilioReady = isTwilioConfigured();
  console.log(
    `[Twilio] ${twilioReady ? 'configured' : 'NOT configured — OTP will fail'} ` +
      `(accountSid=${Boolean(config.twilio.accountSid)}, authToken=${Boolean(config.twilio.authToken)}, verifyServiceSid=${Boolean(config.twilio.verifyServiceSid)})`
  );

  app.listen(config.port,"0.0.0.0", () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    console.log(`Frontend origin: ${config.frontendOrigin}`);
  });
};

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
