import { config } from "dotenv";
import { resolve } from "path";

// Load .env from parent directory (my-slack-app/)
config({ path: resolve(process.cwd(), "../.env") });
