import { describe, it, expect } from "bun:test";
import { newObject } from "./graphs";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import { MockPatch } from "./mocks/MockPatch";
import { MessageType } from "@/lib/nodes/types";
import { getOutboundConnections } from "@/lib/nodes/vm/traversal";

describe("getOutboundConnections", async () => {
  it("two way out", async () => {
    const patch = new MockPatch(undefined, false, false);
    const m1 = new MessageNodeImpl(patch, MessageType.Number);
    const m3 = new MessageNodeImpl(patch, MessageType.Number);

    const filter = newObject("filter.= 1", patch);
    m1.connect(m3, m3.inlets[1], m1.outlets[0]);
    m1.connect(filter, filter.inlets[0], m1.outlets[0]);
    const connections = getOutboundConnections(m1, new Set());
    expect(m1.outlets[0].connections.length).toBe(2);
    expect(connections.length).toBe(2);
  });
});
