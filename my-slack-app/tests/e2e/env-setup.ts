import { config } from "dotenv";
import { resolve } from "path";

// Load .env file so DATABASE_URL and JWT_SECRET are available in tests
config({ path: resolve(process.cwd(), ".env") });
