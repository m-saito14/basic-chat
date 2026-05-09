import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { type Socket } from "socket.io-client";
import {
  connectSocket,
  waitForConnect,
  waitForEvent,
  createToken,
  getDb,
  cleanupUsers,
  cleanupChannels,
  uniqueSuffix,
} from "./helpers";
import { type PrismaClient } from "@prisma/client";

const SUFFIX = uniqueSuffix();
const EMAIL_PREFIX = `socket-join-${SUFFIX}`;

describe("join_room イベント", () => {
  let db: PrismaClient;
  let userId: string | undefined;
  let channelId: string | undefined;
  let socket: Socket | null = null;

  beforeAll(async () => {
    db = getDb();

    const user = await db.user.create({
      data: {
        name: "Join Room Test User",
        email: `${EMAIL_PREFIX}@example.com`,
        password: "hashed-password",
      },
    });
    userId = user.id;

    const channel = await db.channel.create({
      data: { name: `test-channel-${SUFFIX}` },
    });
    channelId = channel.id;
  });

  afterEach(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  });

  afterAll(async () => {
    await cleanupChannels([channelId], db);
    await cleanupUsers(EMAIL_PREFIX, db);
    await db.$disconnect();
  });

  it("非メンバーが join_room を送ると error イベントが返る", async () => {
    if (!userId || !channelId) {
      throw new Error("userId or channelId is undefined");
    }

    const token = await createToken(userId);
    socket = connectSocket(token);
    await waitForConnect(socket);

    const errorPromise = waitForEvent(socket, "error");
    socket.emit("join_room", channelId);
    const error = await errorPromise as { message: string };

    expect(error.message).toBe("このチャンネルへのアクセス権がありません");
  });

  it("メンバーが join_room を送るとエラーは返らない", async () => {
    if (!userId || !channelId) {
      throw new Error("userId or channelId is undefined");
    }

    await db.member.create({ data: { userId, channelId } });

    const token = await createToken(userId);
    socket = connectSocket(token);
    await waitForConnect(socket);

    let errorReceived = false;
    socket.on("error", () => {
      errorReceived = true;
    });

    socket.emit("join_room", channelId);
    await new Promise((r) => setTimeout(r, 200));

    expect(errorReceived).toBe(false);
  });
});
