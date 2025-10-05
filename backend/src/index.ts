import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env.local-only' });

import { app } from './app.js';


const PORT = process.env.PORT || 8080;

// Only start a server if we’re NOT running inside Cloud Functions
if (!process.env.FUNCTIONS_EMULATOR && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Local API listening on http://localhost:${PORT}`);
  });
}

export default app;
