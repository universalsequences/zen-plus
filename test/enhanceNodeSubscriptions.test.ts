import { describe, test, expect, beforeEach } from "bun:test";
import { enhanceNodeWithMultipleSubscribers, getNodeSubscriptionInfo } from "../src/lib/nodes/utils/enhanceNodeSubscriptions";
import { MockObjectNode } from "./mocks/MockObjectNode";

describe("enhanceNodeWithMultipleSubscribers", () => {
  let node: MockObjectNode;

  beforeEach(() => {
    node = new MockObjectNode();
  });

  test("should maintain single subscriber behavior when only one callback is assigned", () => {
    enhanceNodeWithMultipleSubscribers(node);
    
    const receivedValues: any[] = [];
    const callback = (value: any) => receivedValues.push(value);
    
    node.onNewValue = callback;
    
    const testValue = ["test", "value"];
    node.onNewValue?.(testValue);
    
    expect(receivedValues).toHaveLength(1);
    expect(receivedValues[0]).toEqual(testValue);
  });

  test("should support multiple subscribers", () => {
    enhanceNodeWithMultipleSubscribers(node);
    
    const receivedValues1: any[] = [];
    const receivedValues2: any[] = [];
    const receivedValues3: any[] = [];
    
    const callback1 = (value: any) => receivedValues1.push(value);
    const callback2 = (value: any) => receivedValues2.push(value);
    const callback3 = (value: any) => receivedValues3.push(value);
    
    // Assign multiple callbacks
    node.onNewValue = callback1;
    node.onNewValue = callback2;
    node.onNewValue = callback3;
    
    const testValue = ["multiple", "subscribers", "test"];
    node.onNewValue?.(testValue);
    
    // All callbacks should receive the value
    expect(receivedValues1).toHaveLength(1);
    expect(receivedValues1[0]).toEqual(testValue);
    
    expect(receivedValues2).toHaveLength(1);
    expect(receivedValues2[0]).toEqual(testValue);
    
    expect(receivedValues3).toHaveLength(1);
    expect(receivedValues3[0]).toEqual(testValue);
  });

  test("should handle subscription info correctly", () => {
    const infoBeforeEnhancement = getNodeSubscriptionInfo(node);
    expect(infoBeforeEnhancement.isEnhanced).toBe(false);
    expect(infoBeforeEnhancement.subscriberCount).toBe(0);
    
    enhanceNodeWithMultipleSubscribers(node);
    
    const infoAfterEnhancement = getNodeSubscriptionInfo(node);
    expect(infoAfterEnhancement.isEnhanced).toBe(true);
    expect(infoAfterEnhancement.subscriberCount).toBe(0);
    
    // Add subscribers
    node.onNewValue = () => {};
    node.onNewValue = () => {};
    
    const infoWithSubscribers = getNodeSubscriptionInfo(node);
    expect(infoWithSubscribers.subscriberCount).toBe(2);
  });

  test("should preserve original callback when enhancing", () => {
    const originalValues: any[] = [];
    const originalCallback = (value: any) => originalValues.push(`original: ${value}`);
    
    node.onNewValue = originalCallback;
    
    enhanceNodeWithMultipleSubscribers(node);
    
    const newValues: any[] = [];
    const newCallback = (value: any) => newValues.push(`new: ${value}`);
    node.onNewValue = newCallback;
    
    const testValue = "test";
    node.onNewValue?.(testValue);
    
    // Both original and new callbacks should receive the value
    expect(originalValues).toHaveLength(1);
    expect(originalValues[0]).toBe("original: test");
    
    expect(newValues).toHaveLength(1);
    expect(newValues[0]).toBe("new: test");
  });

  test("should not enhance the same node twice", () => {
    enhanceNodeWithMultipleSubscribers(node);
    const info1 = getNodeSubscriptionInfo(node);
    
    // Try to enhance again
    enhanceNodeWithMultipleSubscribers(node);
    const info2 = getNodeSubscriptionInfo(node);
    
    expect(info1.isEnhanced).toBe(true);
    expect(info2.isEnhanced).toBe(true);
    
    // Should still work correctly
    const receivedValues: any[] = [];
    node.onNewValue = (value: any) => receivedValues.push(value);
    
    node.onNewValue?.("test");
    expect(receivedValues).toHaveLength(1);
  });

  test("should handle errors in subscribers gracefully", () => {
    enhanceNodeWithMultipleSubscribers(node);
    
    const goodValues1: any[] = [];
    const goodValues2: any[] = [];
    
    const goodCallback1 = (value: any) => goodValues1.push(value);
    const errorCallback = () => { throw new Error("Test error"); };
    const goodCallback2 = (value: any) => goodValues2.push(value);
    
    node.onNewValue = goodCallback1;
    node.onNewValue = errorCallback;
    node.onNewValue = goodCallback2;
    
    // Should not throw and good callbacks should still work
    expect(() => {
      node.onNewValue?.("test");
    }).not.toThrow();
    
    expect(goodValues1).toHaveLength(1);
    expect(goodValues1[0]).toBe("test");
    expect(goodValues2).toHaveLength(1);
    expect(goodValues2[0]).toBe("test");
  });

  test("should support manual subscriber removal", () => {
    enhanceNodeWithMultipleSubscribers(node);
    
    const values1: any[] = [];
    const values2: any[] = [];
    
    const callback1 = (value: any) => values1.push(value);
    const callback2 = (value: any) => values2.push(value);
    
    node.onNewValue = callback1;
    node.onNewValue = callback2;
    
    // Test before removal
    node.onNewValue?.("before");
    expect(values1).toHaveLength(1);
    expect(values2).toHaveLength(1);
    
    // Remove one subscriber
    if (callback1._subscriberId) {
      (node as any).removeOnNewValueSubscriber(callback1._subscriberId);
    }
    
    // Test after removal
    node.onNewValue?.("after");
    expect(values1).toHaveLength(1); // Should not receive new value
    expect(values2).toHaveLength(2); // Should receive new value
  });

  test("should simulate preset.view scenario", () => {
    // Simulate a preset object
    const presetNode = new MockObjectNode();
    presetNode.name = "preset";
    
    enhanceNodeWithMultipleSubscribers(presetNode);
    
    // Simulate original preset UI
    const originalPresetValues: any[] = [];
    presetNode.onNewValue = (value: any) => originalPresetValues.push(`original: ${JSON.stringify(value)}`);
    
    // Simulate preset.view UI watching the same preset
    const presetViewValues: any[] = [];
    presetNode.onNewValue = (value: any) => presetViewValues.push(`view: ${JSON.stringify(value)}`);
    
    // Simulate preset manager updating
    const presetData = [2, ["Preset 1", "Preset 2", "Preset 3"], {}, 0, 1];
    presetNode.onNewValue?.(presetData);
    
    // Both UIs should receive the update
    expect(originalPresetValues).toHaveLength(1);
    expect(originalPresetValues[0]).toContain("original:");
    
    expect(presetViewValues).toHaveLength(1);
    expect(presetViewValues[0]).toContain("view:");
    
    // Both should have received the same data
    expect(originalPresetValues[0]).toContain(JSON.stringify(presetData));
    expect(presetViewValues[0]).toContain(JSON.stringify(presetData));
  });
});