import { describe, expect, it } from "bun:test";
import { RingBuffer, MessageType, BufferDirection } from "../src/lib/workers/RingBuffer";

describe("RingBuffer", () => {
  // Use a smaller buffer to simplify debugging
  const BUFFER_SIZE = 32 * 4096; // 4KB for testing

  it("should initialize correctly", () => {
    const buffer = new RingBuffer(BUFFER_SIZE);
    expect(buffer).toBeDefined();
    expect(buffer.getBuffer()).toBeInstanceOf(SharedArrayBuffer);
    expect(buffer.getBuffer().byteLength).toBeGreaterThan(BUFFER_SIZE);
  });

  it("should write and read primitive values", () => {
    // This test checks unidirectional use of the buffer
    const buffer = new RingBuffer(BUFFER_SIZE);

    // Test a few different primitive types
    const testValues = [
      { value: 42, description: "number" },
      { value: "hello world", description: "string" },
      { value: true, description: "boolean true" },
      { value: false, description: "boolean false" },
      { value: null, description: "null" },
      { value: [1, 2, 3], description: "array of numbers" },
      { value: { a: 1, b: "test" }, description: "simple object" },
    ];

    for (const { value, description } of testValues) {
      console.log(`Testing ${description}`);

      // Write the value
      buffer.setDirection(BufferDirection.MAIN_TO_WORKER);
      const writeResult = buffer.write(MessageType.EVALUATE_NODE, `test-${description}`, value);
      expect(writeResult).toBe(true);

      // Read the value by changing direction
      buffer.setDirection(BufferDirection.WORKER_TO_MAIN);
      const readResult = buffer.read();

      expect(readResult).toBeDefined();
      expect(readResult?.type).toBe(MessageType.EVALUATE_NODE);
      expect(readResult?.nodeId).toBe(`test-${description}`);
      expect(readResult?.message).toEqual(value);
    }
  });

  it("should handle typed arrays", () => {
    const buffer = new RingBuffer(BUFFER_SIZE);

    // Create test typed arrays
    const float32Array = new Float32Array([1.1, 2.2, 3.3]);
    const float64Array = new Float64Array([4.4, 5.5, 6.6]);
    const int32Array = new Int32Array([7, 8, 9]);

    // Test Float32Array
    console.log("Testing Float32Array");
    buffer.setDirection(BufferDirection.MAIN_TO_WORKER);
    buffer.write(MessageType.EVALUATE_NODE, "float32-test", float32Array);

    buffer.setDirection(BufferDirection.WORKER_TO_MAIN);
    const result1 = buffer.read();
    console.log("Read Float32Array result:", result1?.message);
    expect(result1?.message).toBeInstanceOf(Float32Array);
    expect(Array.from(result1?.message)).toEqual(Array.from(float32Array));

    // Test Float64Array
    console.log("Testing Float64Array");
    buffer.setDirection(BufferDirection.MAIN_TO_WORKER);
    buffer.write(MessageType.EVALUATE_NODE, "float64-test", float64Array);

    buffer.setDirection(BufferDirection.WORKER_TO_MAIN);
    const result2 = buffer.read();
    console.log("Read Float64Array result:", result2?.message);
    expect(result2?.message).toBeInstanceOf(Float64Array);
    expect(Array.from(result2?.message)).toEqual(Array.from(float64Array));

    // Test Int32Array
    console.log("Testing Int32Array");
    buffer.setDirection(BufferDirection.MAIN_TO_WORKER);
    buffer.write(MessageType.EVALUATE_NODE, "int32-test", int32Array);

    buffer.setDirection(BufferDirection.WORKER_TO_MAIN);
    const result3 = buffer.read();
    console.log("Read Int32Array result:", result3?.message);
    expect(result3?.message).toBeInstanceOf(Int32Array);
    expect(Array.from(result3?.message)).toEqual(Array.from(int32Array));
  });

  it("should handle bidirectional communication", () => {
    // Create main buffer first - this will initialize the shared buffer
    const mainBuffer = new RingBuffer(BUFFER_SIZE);

    // Create worker buffer by using the existing shared buffer
    const workerBuffer = new RingBuffer(
      BUFFER_SIZE,
      mainBuffer.getBuffer(),
      BufferDirection.WORKER_TO_MAIN,
    );

    // Main thread sends message to worker
    console.log("Writing main-to-worker message");
    const writeResult = mainBuffer.write(MessageType.EVALUATE_NODE, "main-to-worker", 42);
    expect(writeResult).toBe(true);

    // Worker reads message
    console.log("Reading worker message");
    const workerReceived = workerBuffer.read();
    console.log("Worker received:", workerReceived);
    expect(workerReceived).toBeDefined();
    expect(workerReceived?.type).toBe(MessageType.EVALUATE_NODE);
    expect(workerReceived?.nodeId).toBe("main-to-worker");
    expect(workerReceived?.message).toBe(42);

    // Worker sends response to main thread
    console.log("Writing worker-to-main message");
    const writeResult2 = workerBuffer.write(
      MessageType.MAIN_THREAD_INSTRUCTION,
      "worker-to-main",
      "response",
    );
    expect(writeResult2).toBe(true);

    // Main thread reads response
    console.log("Reading main thread message");
    const mainReceived = mainBuffer.read();
    console.log("Main received:", mainReceived);
    expect(mainReceived).toBeDefined();
    expect(mainReceived?.type).toBe(MessageType.MAIN_THREAD_INSTRUCTION);
    expect(mainReceived?.nodeId).toBe("worker-to-main");
    expect(mainReceived?.message).toBe("response");
  });
});
