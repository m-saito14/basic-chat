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
const EMAIL_PREFIX = `socket-read-${SUFFIX}`;

describe("mark_read イベント", () => {
  let db: PrismaClient;
  let userId: string | undefined;
  let channelId: string | undefined;
  let socket: Socket | null = null;

  beforeAll(async () => {
    db = getDb();

    const user = await db.user.create({
      data: {
        name: "Mark Read Test User",
        email: `${EMAIL_PREFIX}@example.com`,
        password: "hashed-password",
      },
    });
    userId = user.id;

    const channel = await db.channel.create({
      data: { name: `test-channel-${SUFFIX}` },
    });
    channelId = channel.id;

    await db.member.create({ data: { userId, channelId } });
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

  it("メンバーが mark_read を送ると read_update イベントが届き DB の lastReadAt が更新される", async () => {
    const token = await createToken(userId!);
    socket = connectSocket(token);
    await waitForConnect(socket);

    // join_room してから mark_read
    socket.emit("join_room", channelId);
    await new Promise((r) => setTimeout(r, 200));

    const readUpdatePromise = waitForEvent(socket, "read_update");
    socket.emit("mark_read", channelId);

    const readUpdate = await readUpdatePromise as {
      channelId: string;
      userId: string;
      lastReadAt: string;
    };

    expect(readUpdate.channelId).toBe(channelId);
    expect(readUpdate.userId).toBe(userId);
    expect(readUpdate.lastReadAt).toBeDefined();

    // DB の lastReadAt が更新されていることを確認
    const member = await db.member.findFirst({
      where: { userId, channelId },
    });
    expect(member?.lastReadAt).not.toBeNull();
  });
});
