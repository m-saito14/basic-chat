import { io, type Socket } from "socket.io-client";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const TEST_PORT = 3002;

/** テストデータを一意にするサフィックスを生成する */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** userId を持つ JWT を生成する */
export async function createToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
}

/** ソケット接続を作成する (autoConnect: false) */
export function connectSocket(token?: string): Socket {
  return io(`http://localhost:${TEST_PORT}`, {
    autoConnect: false,
    auth: token ? { token } : {},
  });
}

/** ソケットを接続して完了を待つ。接続失敗時は reject する */
export function waitForConnect(socket: Socket): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", (err) => reject(err));
    socket.connect();
  });
}

/** 指定イベントを一度だけ受信して resolve する */
export function waitForEvent(
  socket: Socket,
  event: string,
  timeoutMs = 5000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `waitForEvent: event "${event}" not received within ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/** テスト用 PrismaClient を生成する */
export function getDb(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

/** email が prefix で始まるユーザーを全て削除する */
export async function cleanupUsers(
  emailPrefix: string,
  db: PrismaClient
): Promise<void> {
  await db.user.deleteMany({
    where: { email: { startsWith: emailPrefix } },
  });
}

/** 指定した Channel ID を削除する (Member・Message はカスケード削除される) */
export async function cleanupChannels(
  ids: Array<string | undefined>,
  db: PrismaClient
): Promise<void> {
  const validIds = ids.filter((id): id is string => id !== undefined);
  if (validIds.length === 0) return;
  await db.channel.deleteMany({ where: { id: { in: validIds } } });
}
