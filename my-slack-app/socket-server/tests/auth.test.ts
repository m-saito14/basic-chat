import { describe, it, expect, afterEach } from "vitest";
import { type Socket } from "socket.io-client";
import { connectSocket, waitForConnect, createToken } from "./helpers";

describe("Socket.IO 認証", () => {
  let socket: Socket | null = null;

  afterEach(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  });

  it("トークンなしで接続すると connect_error: Unauthorized が返る", async () => {
    socket = connectSocket();
    await expect(waitForConnect(socket)).rejects.toThrow("Unauthorized");
  });

  it("不正なトークンで接続すると connect_error: Unauthorized が返る", async () => {
    socket = connectSocket("invalid-token");
    await expect(waitForConnect(socket)).rejects.toThrow("Unauthorized");
  });

  it("有効なトークンで接続できる", async () => {
    const token = await createToken("test-user-id");
    socket = connectSocket(token);
    await waitForConnect(socket);
    expect(socket.connected).toBe(true);
  });
});
