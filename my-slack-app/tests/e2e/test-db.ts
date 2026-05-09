import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let _db: PrismaClient | null = null;

function getDb(): PrismaClient {
  if (!_db) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    _db = new PrismaClient({ adapter });
  }
  return _db;
}

export function getTestDb(): PrismaClient {
  return getDb();
}

/**
 * email が prefix で始まるユーザーを全て削除する (Member・Message はカスケード削除される)
 */
export async function cleanupUsers(emailPrefix: string): Promise<void> {
  await getDb().user.deleteMany({
    where: { email: { startsWith: emailPrefix } },
  });
}

/**
 * 指定した Channel ID を削除する (Member・Message はカスケード削除される)
 */
export async function cleanupChannels(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getDb().channel.deleteMany({ where: { id: { in: ids } } });
}
