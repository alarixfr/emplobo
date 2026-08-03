import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./env.js";

const env = loadEnv();
const app = createApp(env);

app.listen(env.PORT, () => {
  console.log(`[api] listening on :${env.PORT} (${env.NODE_ENV})`);
});
