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
const EMAIL_PREFIX = `socket-send-${SUFFIX}`;

describe("send_message イベント", () => {
  let db: PrismaClient;
  let userId: string | undefined;
  let channelId: string | undefined;
  let socket: Socket | null = null;

  beforeAll(async () => {
    db = getDb();

    const user = await db.user.create({
      data: {
        name: "Send Message Test User",
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

  it("非メンバーが send_message を送ると error イベントが返る", async () => {
    const token = await createToken(userId!);
    socket = connectSocket(token);
    await waitForConnect(socket);

    const errorPromise = waitForEvent(socket, "error");
    socket.emit("send_message", { roomId: channelId, text: "Hello" });
    const error = await errorPromise as { message: string };

    expect(error.message).toBe("このチャンネルへのアクセス権がありません");
  });

  it("メンバーが send_message を送ると receive_message イベントが届き DB に保存される", async () => {
    await db.member.create({ data: { userId, channelId } });

    const token = await createToken(userId!);
    socket = connectSocket(token);
    await waitForConnect(socket);

    // join_room してからメッセージ送信
    socket.emit("join_room", channelId);
    await new Promise((r) => setTimeout(r, 200));

    const receivePromise = waitForEvent(socket, "receive_message");
    const messageText = `Test message ${SUFFIX}`;
    socket.emit("send_message", { roomId: channelId, text: messageText });

    const message = await receivePromise as {
      content: string;
      channelId: string;
      userId: string;
    };

    expect(message.content).toBe(messageText);
    expect(message.channelId).toBe(channelId);
    expect(message.userId).toBe(userId);

    // DB に保存されていることを確認
    const dbMessage = await db.message.findFirst({
      where: { channelId, userId, content: messageText },
    });
    expect(dbMessage).not.toBeNull();
  });
});
