// BidirectionalRingBuffer for efficient message passing between threads
// Uses a SharedArrayBuffer and DataView for efficient, type-safe messaging

export type RingBufferMessage = { type: MessageType; nodeId: string; message: any };
// Message type identifiers
export enum MessageType {
  // Main-to-Worker message types
  EVALUATE_NODE = 1,
  UPDATE_OBJECT = 2,
  UPDATE_MESSAGE = 3,
  LOADBANG = 4,
  PUBLISH = 5,
  PUBLISH_OPTIMIZED = 6,
  ATTRUI = 7,
  SET_COMPILATION = 8,

  // Worker-to-Main message types
  MAIN_THREAD_INSTRUCTION = 101,
  OPTIMIZED_MAIN_THREAD_INSTRUCTION = 102,
  NEW_SHARED_BUFFER = 103,
  NEW_VALUE = 104,
  REPLACE_MESSAGE = 105,
  ATTRIBUTE_UPDATE = 106,
  UPDATE_UX = 107,
}

// Buffer directions
export enum BufferDirection {
  MAIN_TO_WORKER = 0,
  WORKER_TO_MAIN = 1,
}

/**
 * A bidirectional ring buffer for efficient communication between main thread and worker
 * This contains two ring buffers in the same SharedArrayBuffer:
 * 1. Main thread → Worker (for sending commands)
 * 2. Worker → Main thread (for sending back instructions, etc.)
 */
export class RingBuffer {
  private buffer: SharedArrayBuffer;
  private view: DataView;
  private bufferSize: number;
  private direction: BufferDirection;

  // Header structure (bytes):
  // [0-3]: Main→Worker write pointer
  // [4-7]: Main→Worker read pointer
  // [8-11]: Worker→Main write pointer
  // [12-15]: Worker→Main read pointer
  // [16-19]: Buffer size for each direction
  // [20]: Lock for Main→Worker buffer
  // [21]: Lock for Worker→Main buffer
  // [22-23]: Reserved for future use
  // [24-1023]: Reserved for metadata (future expansion)
  // [1024+]: Buffer data area

  private static readonly HEADER_SIZE = 1024;
  private static readonly MAIN_TO_WORKER_WRITE_PTR = 0;
  private static readonly MAIN_TO_WORKER_READ_PTR = 4;
  private static readonly WORKER_TO_MAIN_WRITE_PTR = 8;
  private static readonly WORKER_TO_MAIN_READ_PTR = 12;
  private static readonly BUFFER_SIZE = 16;
  private static readonly MAIN_TO_WORKER_LOCK = 20;
  private static readonly WORKER_TO_MAIN_LOCK = 21;

  /**
   * Create a new RingBuffer
   * @param sizeInBytes Total size of the buffer in bytes (split between two directions)
   * @param existingBuffer Optional existing SharedArrayBuffer to use
   * @param direction Which direction this instance will use for writing
   */
  constructor(
    sizeInBytes: number = 1024 * 1024,
    existingBuffer?: SharedArrayBuffer,
    direction: BufferDirection = BufferDirection.MAIN_TO_WORKER,
  ) {
    if (existingBuffer) {
      // Use existing buffer (e.g., when worker receives the buffer from main thread)
      this.buffer = existingBuffer;
      this.view = new DataView(this.buffer);
      this.bufferSize = this.view.getUint32(RingBuffer.BUFFER_SIZE);

      // Make sure the buffer is already initialized
      if (this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR) === 0) {
        console.error("Buffer not properly initialized");
        // Re-initialize
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR, RingBuffer.HEADER_SIZE);
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR, RingBuffer.HEADER_SIZE);
        this.view.setUint32(
          RingBuffer.WORKER_TO_MAIN_WRITE_PTR,
          RingBuffer.HEADER_SIZE + this.bufferSize,
        );
        this.view.setUint32(
          RingBuffer.WORKER_TO_MAIN_READ_PTR,
          RingBuffer.HEADER_SIZE + this.bufferSize,
        );
      }
    } else {
      // Create new buffer
      const totalSize = sizeInBytes * 2 + RingBuffer.HEADER_SIZE;
      this.buffer = new SharedArrayBuffer(totalSize);
      this.view = new DataView(this.buffer);
      this.bufferSize = sizeInBytes;

      // Initialize header
      // Each buffer's data area starts after the header
      this.view.setUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR, RingBuffer.HEADER_SIZE);
      this.view.setUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR, RingBuffer.HEADER_SIZE);
      this.view.setUint32(
        RingBuffer.WORKER_TO_MAIN_WRITE_PTR,
        RingBuffer.HEADER_SIZE + sizeInBytes,
      );
      this.view.setUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR, RingBuffer.HEADER_SIZE + sizeInBytes);
      this.view.setUint32(RingBuffer.BUFFER_SIZE, sizeInBytes);
      this.view.setUint8(RingBuffer.MAIN_TO_WORKER_LOCK, 0);
      this.view.setUint8(RingBuffer.WORKER_TO_MAIN_LOCK, 0);

      // Add some debugging info
      console.log(`RingBuffer initialized with size ${sizeInBytes} bytes`);
    }

    this.direction = direction;
  }

  /**
   * Get the SharedArrayBuffer for passing to another thread
   */
  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }

  /**
   * Set the direction of this RingBuffer instance
   */
  setDirection(direction: BufferDirection): void {
    this.direction = direction;
  }

  /**
   * Get the current direction of this RingBuffer instance
   */
  getDirection(): BufferDirection {
    return this.direction;
  }

  // Callback function to signal that new data is available
  signalCallback?: (count?: number) => void;

  /**
   * Set a callback function to be called when new data is written to the buffer
   * This enables a signal-based approach instead of polling
   */
  setSignalCallback(callback: () => void): void {
    this.signalCallback = callback;
  }

  /**
   * Writes a message to the ring buffer in the current direction
   * Returns true if the message was written successfully
   */
  write(type: MessageType, nodeId: string, message?: any, signal = true): boolean {
    //console.log(`RingBuffer.write - type=${type}, nodeId=${nodeId}, direction=${this.direction === BufferDirection.MAIN_TO_WORKER ? "MAIN_TO_WORKER" : "WORKER_TO_MAIN"}`);

    // Special cases for optimized message formats
    if (type === MessageType.PUBLISH_OPTIMIZED) {
      return this.writeOptimizedPublish(nodeId, message);
    }

    if (type === MessageType.OPTIMIZED_MAIN_THREAD_INSTRUCTION) {
      return this.writeOptimizedMainThreadInstruction(nodeId, message);
    }

    // Determine which buffer to use based on direction
    let writePtr: number, readPtr: number, bufferStart: number, lockOffset: number;

    if (this.direction === BufferDirection.MAIN_TO_WORKER) {
      writePtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR);
      readPtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR);
      bufferStart = RingBuffer.HEADER_SIZE;
      lockOffset = RingBuffer.MAIN_TO_WORKER_LOCK;
    } else {
      writePtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR);
      readPtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR);
      bufferStart = RingBuffer.HEADER_SIZE + this.bufferSize;
      lockOffset = RingBuffer.WORKER_TO_MAIN_LOCK;
    }

    /*
    console.log("RingBuffer.write pointers:", {
      writePtr,
      readPtr,
      bufferStart,
      pointerDiff: writePtr - readPtr
    });
    */

    // Try to acquire lock
    if (Atomics.compareExchange(new Uint8Array(this.buffer), lockOffset, 0, 1) !== 0) {
      return false; // Couldn't get lock, another thread is writing
    }

    try {
      // Calculate available space
      let availableSpace: number;
      const bufferEnd = bufferStart + this.bufferSize;

      if (writePtr >= readPtr) {
        // Write pointer is ahead or equal to read pointer
        const wrappedWritePtr = ((writePtr - bufferStart) % this.bufferSize) + bufferStart;
        const wrappedReadPtr = ((readPtr - bufferStart) % this.bufferSize) + bufferStart;

        if (wrappedWritePtr >= wrappedReadPtr) {
          // Normal case: writePtr ahead of readPtr
          availableSpace = bufferEnd - wrappedWritePtr + (wrappedReadPtr - bufferStart) - 1;
        } else {
          // Wrapped case: readPtr ahead of writePtr
          availableSpace = wrappedReadPtr - wrappedWritePtr - 1;
        }
      } else {
        // Read pointer is ahead of write pointer (unusual case)
        availableSpace = readPtr - writePtr - 1;
      }

      // Encode the message
      const encodedMessage = this.encodeMessage(type, nodeId, message);

      // Check if we have enough space for this message
      if (encodedMessage.byteLength > availableSpace) {
        return false; // Not enough space
      }

      // Write the message type and length
      const messageLength = encodedMessage.byteLength;

      // Additional safety check for message size
      const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
      if (messageLength <= 0 || messageLength > MAX_MESSAGE_SIZE) {
        console.error(`Invalid message length for writing: ${messageLength}`);
        return false;
      }

      const messageHeaderSize = 5; // 1 byte for type + 4 bytes for length

      const wrappedWritePtr = ((writePtr - bufferStart) % this.bufferSize) + bufferStart;

      try {
        // Write message type
        this.view.setUint8(wrappedWritePtr, type);

        // Write message length
        const lengthPtr = ((wrappedWritePtr + 1) % this.bufferSize) + bufferStart;
        if (lengthPtr + 4 <= bufferEnd) {
          // Length fits without wrapping
          this.view.setUint32(lengthPtr, messageLength);
        } else {
          // Length wraps around buffer end
          const bytesAtEnd = bufferEnd - lengthPtr;
          for (let i = 0; i < bytesAtEnd; i++) {
            this.view.setUint8(lengthPtr + i, (messageLength >> (8 * i)) & 0xff);
          }
          for (let i = 0; i < 4 - bytesAtEnd; i++) {
            this.view.setUint8(bufferStart + i, (messageLength >> (8 * (bytesAtEnd + i))) & 0xff);
          }
        }

        // Write the message data
        const messageStartRelative = (wrappedWritePtr + messageHeaderSize) % this.bufferSize;
        const messageStart = messageStartRelative + bufferStart;

        // Handle the case where the message wraps around the end of the buffer
        if (messageStart + messageLength > bufferEnd) {
          // Part 1: Write data until the end of the buffer
          const part1Length = bufferEnd - messageStart;

          // Validate part1Length
          if (part1Length <= 0 || part1Length > this.bufferSize) {
            throw new Error(`Invalid part1Length for writing: ${part1Length}`);
          }

          new Uint8Array(this.buffer, messageStart, part1Length).set(
            new Uint8Array(encodedMessage, 0, part1Length),
          );

          // Part 2: Write remaining data at the beginning of the buffer
          const part2Length = messageLength - part1Length;

          // Validate part2Length
          if (part2Length <= 0 || part2Length > this.bufferSize) {
            throw new Error(`Invalid part2Length for writing: ${part2Length}`);
          }

          new Uint8Array(this.buffer, bufferStart, part2Length).set(
            new Uint8Array(encodedMessage, part1Length, part2Length),
          );
        } else {
          // Message fits without wrapping
          new Uint8Array(this.buffer, messageStart, messageLength).set(
            new Uint8Array(encodedMessage),
          );
        }
      } catch (error) {
        console.error("Error writing to ring buffer:", error);
        console.error("Debug info:", {
          writePtr,
          readPtr,
          wrappedWritePtr,
          messageLength,
          bufferStart,
          bufferEnd,
          bufferSize: this.bufferSize,
          totalBufferSize: this.buffer.byteLength,
        });
        return false;
      }

      // Update the write pointer atomically
      const newWritePtr =
        ((wrappedWritePtr + messageHeaderSize + messageLength) % this.bufferSize) + bufferStart;

      /*
      console.log("RingBuffer: Updating write pointer", {
        oldWritePtr: writePtr,
        newWritePtr,
        wrappedWritePtr,
        messageHeaderSize,
        messageLength,
        bufferStart,
        bufferSize: this.bufferSize,
        direction: this.direction === BufferDirection.MAIN_TO_WORKER ? "MAIN_TO_WORKER" : "WORKER_TO_MAIN"
      });
      */

      if (this.direction === BufferDirection.MAIN_TO_WORKER) {
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR, newWritePtr);
      } else {
        this.view.setUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR, newWritePtr);
      }

      // Signal that new data is available (if callback is set)
      if (this.signalCallback && signal) {
        this.signalCallback();
      }

      return true;
    } finally {
      // Release lock
      Atomics.store(new Uint8Array(this.buffer), lockOffset, 0);
    }
  }

  /**
   * Specialized method for writing publish messages with optimized format
   * Format: {type: string, subType: integer, value: float}
   * This is much more efficient than the general message encoding
   */
  writeOptimizedPublish(
    nodeId: string,
    message: { type: string; subType: number; value: number },
  ): boolean {
    // Determine which buffer to use based on direction
    let writePtr: number, readPtr: number, bufferStart: number, lockOffset: number;

    if (this.direction === BufferDirection.MAIN_TO_WORKER) {
      writePtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR);
      readPtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR);
      bufferStart = RingBuffer.HEADER_SIZE;
      lockOffset = RingBuffer.MAIN_TO_WORKER_LOCK;
    } else {
      writePtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR);
      readPtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR);
      bufferStart = RingBuffer.HEADER_SIZE + this.bufferSize;
      lockOffset = RingBuffer.WORKER_TO_MAIN_LOCK;
    }

    // Try to acquire lock
    if (Atomics.compareExchange(new Uint8Array(this.buffer), lockOffset, 0, 1) !== 0) {
      return false; // Couldn't get lock, another thread is writing
    }

    try {
      // Calculate available space
      let availableSpace: number;
      const bufferEnd = bufferStart + this.bufferSize;

      if (writePtr >= readPtr) {
        // Write pointer is ahead or equal to read pointer
        const wrappedWritePtr = ((writePtr - bufferStart) % this.bufferSize) + bufferStart;
        const wrappedReadPtr = ((readPtr - bufferStart) % this.bufferSize) + bufferStart;

        if (wrappedWritePtr >= wrappedReadPtr) {
          // Normal case: writePtr ahead of readPtr
          availableSpace = bufferEnd - wrappedWritePtr + (wrappedReadPtr - bufferStart) - 1;
        } else {
          // Wrapped case: readPtr ahead of writePtr
          availableSpace = wrappedReadPtr - wrappedWritePtr - 1;
        }
      } else {
        // Read pointer is ahead of write pointer (unusual case)
        availableSpace = readPtr - writePtr - 1;
      }

      // For optimized publish we need:
      // 1 byte for message type
      // 2 bytes for nodeId length (always empty string or "global")
      // nodeId bytes (minimal)
      // 2 bytes for type string length + type string bytes
      // 4 bytes for subType integer
      // 8 bytes for value float64

      const encoder = new TextEncoder();
      const typeStrBytes = encoder.encode(message.type);
      const nodeIdBytes = encoder.encode(nodeId);

      // Calculate total message size
      const totalSize = 1 + 2 + nodeIdBytes.length + 2 + typeStrBytes.length + 4 + 8;

      // Check if we have enough space
      if (totalSize > availableSpace) {
        return false; // Not enough space
      }

      const wrappedWritePtr = ((writePtr - bufferStart) % this.bufferSize) + bufferStart;
      let currentPtr = wrappedWritePtr;

      // Write message type
      this.view.setUint8(currentPtr, MessageType.PUBLISH_OPTIMIZED);
      currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);

      // Write nodeId length
      this.view.setUint16(currentPtr, nodeIdBytes.length);
      currentPtr = this.incrementPointer(currentPtr, 2, bufferStart, bufferEnd);

      // Write nodeId bytes
      for (let i = 0; i < nodeIdBytes.length; i++) {
        this.view.setUint8(currentPtr, nodeIdBytes[i]);
        currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);
      }

      // Write type string length
      this.view.setUint16(currentPtr, typeStrBytes.length);
      currentPtr = this.incrementPointer(currentPtr, 2, bufferStart, bufferEnd);

      // Write type string bytes
      for (let i = 0; i < typeStrBytes.length; i++) {
        this.view.setUint8(currentPtr, typeStrBytes[i]);
        currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);
      }

      // Write subType as Int32
      this.view.setInt32(currentPtr, message.subType);
      currentPtr = this.incrementPointer(currentPtr, 4, bufferStart, bufferEnd);

      // Write value as Float64
      this.view.setFloat64(currentPtr, message.value);
      currentPtr = this.incrementPointer(currentPtr, 8, bufferStart, bufferEnd);

      // Update the write pointer atomically
      if (this.direction === BufferDirection.MAIN_TO_WORKER) {
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR, currentPtr);
      } else {
        this.view.setUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR, currentPtr);
      }

      // Signal that new data is available (if callback is set)
      if (this.signalCallback) {
        this.signalCallback();
      }

      return true;
    } finally {
      // Release lock
      Atomics.store(new Uint8Array(this.buffer), lockOffset, 0);
    }
  }

  /**
   * Helper method to increment a pointer in the ring buffer, handling wrapping
   */
  private incrementPointer(
    pointer: number,
    increment: number,
    bufferStart: number,
    bufferEnd: number,
  ): number {
    const newPointer = pointer + increment;
    if (newPointer >= bufferEnd) {
      // Wrap around to beginning of buffer area
      return bufferStart + (newPointer - bufferEnd);
    }
    return newPointer;
  }

  /**
   * Reads a message from the ring buffer in the opposite direction
   * Returns undefined if no message is available
   */
  read(): RingBufferMessage | undefined {
    try {
      // Determine which buffer to read from (opposite of the direction we write to)
      let writePtr: number,
        readPtr: number,
        bufferStart: number,
        readPtrOffset: number,
        lockOffset: number;

      if (this.direction === BufferDirection.MAIN_TO_WORKER) {
        // Main thread reads from worker-to-main buffer
        writePtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR);
        readPtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR);
        bufferStart = RingBuffer.HEADER_SIZE + this.bufferSize;
        readPtrOffset = RingBuffer.WORKER_TO_MAIN_READ_PTR;
        lockOffset = RingBuffer.WORKER_TO_MAIN_LOCK;
      } else {
        // Worker reads from main-to-worker buffer
        writePtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR);
        readPtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR);
        bufferStart = RingBuffer.HEADER_SIZE;
        readPtrOffset = RingBuffer.MAIN_TO_WORKER_READ_PTR;
        lockOffset = RingBuffer.MAIN_TO_WORKER_LOCK;
      }

      /*
      console.log("RingBuffer.read pointers:", {
        direction: this.direction === BufferDirection.MAIN_TO_WORKER ? "MAIN_TO_WORKER" : "WORKER_TO_MAIN",
        writePtr,
        readPtr,
        bufferStart,
        pointerDiff: writePtr - readPtr,
        reading: this.direction === BufferDirection.MAIN_TO_WORKER ? "WORKER_TO_MAIN" : "MAIN_TO_WORKER"
      });
      */

      // Validate pointers to ensure they're in range
      const bufferEnd = bufferStart + this.bufferSize;
      if (
        writePtr < bufferStart ||
        writePtr >= bufferEnd ||
        readPtr < bufferStart ||
        readPtr >= bufferEnd
      ) {
        console.error("Invalid buffer pointers in read(), resetting");
        this.clear();
        return undefined;
      }

      // Check if there's data to read
      if (readPtr === writePtr) {
        return undefined; // Buffer is empty
      }

      // Try to acquire lock
      if (Atomics.compareExchange(new Uint8Array(this.buffer), lockOffset, 0, 1) !== 0) {
        return undefined; // Couldn't get lock, another thread is reading
      }

      try {
        // Recheck if there's data after acquiring lock
        if (readPtr === writePtr) {
          return undefined; // Buffer became empty
        }

        const wrappedReadPtr = ((readPtr - bufferStart) % this.bufferSize) + bufferStart;

        // Read the message type - make sure we're not reading past buffer end
        if (wrappedReadPtr >= bufferEnd) {
          console.error("Read pointer out of range", wrappedReadPtr, bufferEnd);
          // Reset to beginning of buffer
          this.view.setUint32(readPtrOffset, bufferStart);
          return undefined;
        }

        const type = this.view.getUint8(wrappedReadPtr) as MessageType;

        // Special cases for optimized message formats
        if (type === MessageType.PUBLISH_OPTIMIZED) {
          return this.readOptimizedPublish(wrappedReadPtr, bufferStart, bufferEnd, readPtrOffset);
        }

        if (type === MessageType.OPTIMIZED_MAIN_THREAD_INSTRUCTION) {
          return this.readOptimizedMainThreadInstruction(
            wrappedReadPtr,
            bufferStart,
            bufferEnd,
            readPtrOffset,
          );
        }

        // Read the message length
        const lengthPtr = ((wrappedReadPtr + 1) % this.bufferSize) + bufferStart;
        if (lengthPtr >= bufferEnd) {
          console.error("Length pointer out of range", lengthPtr, bufferEnd);
          // Reset to beginning of buffer
          this.view.setUint32(readPtrOffset, bufferStart);
          return undefined;
        }

        let messageLength: number;

        if (lengthPtr + 4 <= bufferEnd) {
          // Length doesn't wrap
          messageLength = this.view.getUint32(lengthPtr);
        } else {
          // Length wraps around buffer end
          messageLength = 0;
          const bytesAtEnd = bufferEnd - lengthPtr;
          for (let i = 0; i < bytesAtEnd; i++) {
            messageLength |= this.view.getUint8(lengthPtr + i) << (8 * i);
          }
          for (let i = 0; i < 4 - bytesAtEnd; i++) {
            messageLength |= this.view.getUint8(bufferStart + i) << (8 * (bytesAtEnd + i));
          }
        }

        // Sanity check message length to prevent errors
        // Cap at a reasonable size and ensure it's positive
        const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
        if (messageLength <= 0 || messageLength > MAX_MESSAGE_SIZE) {
          console.error(`Invalid message length detected: ${messageLength}, resetting buffer`);
          // Reset the read pointer to avoid getting stuck in a bad state
          this.view.setUint32(readPtrOffset, writePtr);
          return undefined;
        }

        // Allocate buffer for encoded message
        const messageBuffer = new ArrayBuffer(messageLength);

        // Read the message data
        const messageHeaderSize = 5; // type + length
        const messageStartRelative = (wrappedReadPtr + messageHeaderSize) % this.bufferSize;
        const messageStart = messageStartRelative + bufferStart;

        try {
          // Handle message that wraps around the buffer end
          if (messageStart + messageLength > bufferEnd) {
            // Part 1: Read from current position to end of buffer
            const part1Length = bufferEnd - messageStart;

            // Double-check that part1Length is valid
            if (part1Length <= 0 || part1Length > this.bufferSize) {
              throw new Error(`Invalid part1Length: ${part1Length}`);
            }

            new Uint8Array(messageBuffer, 0, part1Length).set(
              new Uint8Array(this.buffer, messageStart, part1Length),
            );

            // Part 2: Read remaining from beginning of buffer
            const part2Length = messageLength - part1Length;

            // Double-check that part2Length is valid
            if (part2Length <= 0 || part2Length > this.bufferSize) {
              throw new Error(`Invalid part2Length: ${part2Length}`);
            }

            new Uint8Array(messageBuffer, part1Length, part2Length).set(
              new Uint8Array(this.buffer, bufferStart, part2Length),
            );
          } else {
            // Message fits without wrapping
            new Uint8Array(messageBuffer).set(
              new Uint8Array(this.buffer, messageStart, messageLength),
            );
          }
        } catch (error) {
          console.error("Error reading from ring buffer:", error);
          console.error("Debug info:", {
            messageStart,
            messageLength,
            bufferStart,
            bufferEnd,
            bufferSize: this.bufferSize,
            totalBufferSize: this.buffer.byteLength,
          });

          // Reset the read pointer to avoid getting stuck in a bad state
          this.view.setUint32(readPtrOffset, writePtr);
          return undefined;
        }

        // Update the read pointer
        const newReadPtr =
          ((wrappedReadPtr + messageHeaderSize + messageLength) % this.bufferSize) + bufferStart;

        /*
        console.log("RingBuffer: Updating read pointer", {
          oldReadPtr: readPtr,
          newReadPtr,
          wrappedReadPtr,
          messageHeaderSize,
          messageLength,
          bufferStart,
          bufferSize: this.bufferSize
        });
        */

        this.view.setUint32(readPtrOffset, newReadPtr);

        try {
          // Decode message
          return this.decodeMessage(messageBuffer, type);
        } catch (error) {
          console.error("Error decoding message from buffer:", error);
          return undefined;
        }
      } finally {
        // Always release lock
        Atomics.store(new Uint8Array(this.buffer), lockOffset, 0);
      }
    } catch (error) {
      console.error("Unexpected error in read():", error);
      return undefined;
    }
  }

  // Type identifiers for binary encoding
  private static readonly VALUE_TYPE_NULL = 0;
  private static readonly VALUE_TYPE_UNDEFINED = 1;
  private static readonly VALUE_TYPE_NUMBER = 2;
  private static readonly VALUE_TYPE_STRING = 3;
  private static readonly VALUE_TYPE_BOOLEAN_TRUE = 4;
  private static readonly VALUE_TYPE_BOOLEAN_FALSE = 5;
  private static readonly VALUE_TYPE_ARRAY = 6;
  private static readonly VALUE_TYPE_OBJECT = 7;
  private static readonly VALUE_TYPE_FLOAT32_ARRAY = 8;
  private static readonly VALUE_TYPE_FLOAT64_ARRAY = 9;
  private static readonly VALUE_TYPE_INT32_ARRAY = 10;

  // Constants for performance monitoring
  private static readonly DEBUG_ENCODING = true; // Set to true to enable debug logs

  // Track statistics for message size optimization
  private static jsonSize: number = 0;
  private static binarySize: number = 0;
  private static messageCount: number = 0;

  // Log statistics periodically
  private static logEncodingStats() {
    if (this.messageCount > 0 && this.messageCount % 100 === 0) {
      const savingsBytes = this.jsonSize - this.binarySize;
      const savingsPercent = (savingsBytes / this.jsonSize) * 100;
      /*
      console.log(
        `RingBuffer encoding stats after ${this.messageCount} messages:\n` +
          `JSON size: ${this.jsonSize} bytes\n` +
          `Binary size: ${this.binarySize} bytes\n` +
          `Savings: ${savingsBytes} bytes (${savingsPercent.toFixed(2)}%)`,
      );
      */
    }
  }

  /**
   * Encode a message for writing to the buffer
   */
  private encodeMessage(type: MessageType, nodeId: string, message?: any): ArrayBuffer {
    // First, convert nodeId to UTF-8 bytes
    const encoder = new TextEncoder();
    const nodeIdBytes = encoder.encode(nodeId);

    // Track size differences for debugging if enabled
    if (RingBuffer.DEBUG_ENCODING && message !== undefined) {
      try {
        // Measure what the JSON size would have been
        const jsonString = JSON.stringify(message);
        const jsonBytes = encoder.encode(jsonString).byteLength;
        RingBuffer.jsonSize += jsonBytes;
        RingBuffer.messageCount++;
      } catch (e) {
        // Silently ignore JSON measurement errors
      }
    }

    // Pre-calculate message encoding to determine buffer size
    const messageEncoding = this.encodeValue(message);
    const messageBodySize = messageEncoding ? messageEncoding.byteLength : 0;

    // Track binary size for comparison
    if (RingBuffer.DEBUG_ENCODING && message !== undefined) {
      RingBuffer.binarySize += messageBodySize;
      RingBuffer.logEncodingStats();
    }

    // Total message size: nodeId length (2 bytes) + nodeId bytes + message data
    const totalSize = 2 + nodeIdBytes.length + messageBodySize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write nodeId length
    view.setUint16(0, nodeIdBytes.length);

    // Write nodeId bytes
    new Uint8Array(buffer, 2, nodeIdBytes.length).set(nodeIdBytes);

    // Write message body if present
    if (messageEncoding && messageBodySize > 0) {
      new Uint8Array(buffer, 2 + nodeIdBytes.length, messageBodySize).set(
        new Uint8Array(messageEncoding),
      );
    }

    return buffer;
  }

  /**
   * Encode a value of any type into a binary format
   * Returns a buffer containing the encoded value
   */
  private encodeValue(value: any): ArrayBuffer | null {
    // Handle undefined and null
    if (value === undefined) {
      const buffer = new ArrayBuffer(1);
      new DataView(buffer).setUint8(0, RingBuffer.VALUE_TYPE_UNDEFINED);
      return buffer;
    }

    if (value === null) {
      const buffer = new ArrayBuffer(1);
      new DataView(buffer).setUint8(0, RingBuffer.VALUE_TYPE_NULL);
      return buffer;
    }

    // Handle number values directly (most efficient for audio data)
    if (typeof value === "number") {
      const buffer = new ArrayBuffer(9); // 1 byte type + 8 bytes for float64
      const view = new DataView(buffer);
      view.setUint8(0, RingBuffer.VALUE_TYPE_NUMBER);
      view.setFloat64(1, value);
      return buffer;
    }

    // Handle boolean values (very efficient)
    if (typeof value === "boolean") {
      const buffer = new ArrayBuffer(1);
      new DataView(buffer).setUint8(
        0,
        value ? RingBuffer.VALUE_TYPE_BOOLEAN_TRUE : RingBuffer.VALUE_TYPE_BOOLEAN_FALSE,
      );
      return buffer;
    }

    // Handle string values efficiently
    if (typeof value === "string") {
      const encoder = new TextEncoder();
      const stringBytes = encoder.encode(value);
      const buffer = new ArrayBuffer(5 + stringBytes.byteLength); // 1 byte type + 4 bytes length + string data
      const view = new DataView(buffer);
      view.setUint8(0, RingBuffer.VALUE_TYPE_STRING);
      view.setUint32(1, stringBytes.byteLength);
      new Uint8Array(buffer, 5, stringBytes.byteLength).set(stringBytes);
      return buffer;
    }

    // Special handling for TypedArrays which are common in audio processing
    if (value instanceof Float32Array) {
      // Need to ensure proper alignment - we'll use 8 byte alignment for safety
      const headerSize = 8; // 1 byte type + 4 bytes length + 3 bytes padding for alignment
      const buffer = new ArrayBuffer(headerSize + value.length * 4);
      const view = new DataView(buffer);
      view.setUint8(0, RingBuffer.VALUE_TYPE_FLOAT32_ARRAY);
      view.setUint32(1, value.length);

      // Copy the Float32Array data (with proper alignment at 8 bytes)
      const dataArray = new Float32Array(buffer);
      // Start at index 2 in the Float32Array view (which is byte offset 8)
      dataArray.set(value, 2);
      return buffer;
    }

    if (value instanceof Float64Array) {
      // Float64Array already requires 8-byte alignment
      const headerSize = 8; // 1 byte type + 4 bytes length + 3 bytes padding for alignment
      const buffer = new ArrayBuffer(headerSize + value.length * 8);
      const view = new DataView(buffer);
      view.setUint8(0, RingBuffer.VALUE_TYPE_FLOAT64_ARRAY);
      view.setUint32(1, value.length);

      // Copy the Float64Array data (with proper alignment)
      const dataArray = new Float64Array(buffer);
      // Start at index 1 in the Float64Array view (which is byte offset 8)
      dataArray.set(value, 1);
      return buffer;
    }

    if (value instanceof Int32Array) {
      const headerSize = 8; // 1 byte type + 4 bytes length + 3 bytes padding for alignment
      const buffer = new ArrayBuffer(headerSize + value.length * 4);
      const view = new DataView(buffer);
      view.setUint8(0, RingBuffer.VALUE_TYPE_INT32_ARRAY);
      view.setUint32(1, value.length);

      // Copy the Int32Array data (with proper alignment)
      const dataArray = new Int32Array(buffer);
      // Start at index 2 in the Int32Array view (which is byte offset 8)
      dataArray.set(value, 2);
      return buffer;
    }

    // Handle arrays efficiently if they contain only numbers or strings
    if (Array.isArray(value)) {
      // Check if it's a TypedArray-like numeric array (common case in audio processing)
      const isAllNumbers = value.every((item) => typeof item === "number");
      if (isAllNumbers && value.length > 0) {
        // Encode as a packed numeric array
        const buffer = new ArrayBuffer(9 + value.length * 8); // 1 byte type + 4 bytes length + 4 bytes element size + elements
        const view = new DataView(buffer);
        view.setUint8(0, RingBuffer.VALUE_TYPE_ARRAY); // Array type
        view.setUint32(1, value.length); // Number of elements
        view.setUint32(5, 8); // Each element is 8 bytes (Float64)

        // Write all numbers efficiently
        for (let i = 0; i < value.length; i++) {
          view.setFloat64(9 + i * 8, value[i]);
        }
        return buffer;
      } else {
        // Mixed array - encode each element separately
        // First pass: measure total size
        let totalSize = 5; // 1 byte type + 4 bytes length
        const encodedItems: ArrayBuffer[] = [];

        for (const item of value) {
          const encodedItem = this.encodeValue(item);
          if (encodedItem) {
            encodedItems.push(encodedItem);
            totalSize += encodedItem.byteLength;
          }
        }

        // Second pass: write all items
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        view.setUint8(0, RingBuffer.VALUE_TYPE_ARRAY);
        view.setUint32(1, encodedItems.length);

        let offset = 5;
        for (const encodedItem of encodedItems) {
          new Uint8Array(buffer, offset, encodedItem.byteLength).set(new Uint8Array(encodedItem));
          offset += encodedItem.byteLength;
        }

        return buffer;
      }
    }

    // For objects and anything else, fall back to JSON (less efficient but handles all cases)
    try {
      const encoder = new TextEncoder();
      const jsonStr = JSON.stringify(value);
      const jsonBytes = encoder.encode(jsonStr);

      const buffer = new ArrayBuffer(5 + jsonBytes.byteLength); // 1 byte type + 4 bytes length + json data
      const view = new DataView(buffer);
      view.setUint8(0, RingBuffer.VALUE_TYPE_OBJECT);
      view.setUint32(1, jsonBytes.byteLength);
      new Uint8Array(buffer, 5, jsonBytes.byteLength).set(jsonBytes);

      return buffer;
    } catch (e) {
      console.error("Error encoding value:", e);
      return null;
    }
  }

  /**
   * Decode a message from the buffer
   */
  private decodeMessage(
    buffer: ArrayBuffer,
    type: MessageType,
  ): { type: MessageType; nodeId: string; message: any } {
    const decoder = new TextDecoder();
    const view = new DataView(buffer);

    // Read nodeId
    const nodeIdLength = view.getUint16(0);
    const nodeIdBytes = new Uint8Array(buffer, 2, nodeIdLength);
    const nodeId = decoder.decode(nodeIdBytes);

    // Decode the message from the rest of the buffer
    let message: any = undefined;
    if (buffer.byteLength > 2 + nodeIdLength) {
      const messageBuffer = buffer.slice(2 + nodeIdLength);
      message = this.decodeValue(messageBuffer).value;
    }
    return { type, nodeId, message };
  }

  /**
   * Decode a value from its binary representation
   */
  private decodeValue(buffer: ArrayBuffer, offset: number = 0): { value: any; size: number } {
    if (!buffer || buffer.byteLength <= offset) {
      console.error("Invalid or empty buffer in decodeValue");
      return { value: undefined, size: 0 };
    }

    try {
      const view = new DataView(buffer);
      const valueType = view.getUint8(offset);

      switch (valueType) {
        case RingBuffer.VALUE_TYPE_NULL:
          return { value: null, size: 1 };

        case RingBuffer.VALUE_TYPE_UNDEFINED:
          return { value: undefined, size: 1 };

        case RingBuffer.VALUE_TYPE_NUMBER:
          if (buffer.byteLength < offset + 9) {
            console.error("Invalid buffer length for number decoding");
            return { value: undefined, size: 0 };
          }
          return { value: view.getFloat64(offset + 1), size: 9 };

        case RingBuffer.VALUE_TYPE_BOOLEAN_TRUE:
          return { value: true, size: 1 };

        case RingBuffer.VALUE_TYPE_BOOLEAN_FALSE:
          return { value: false, size: 1 };

        case RingBuffer.VALUE_TYPE_STRING:
          if (buffer.byteLength < offset + 5) {
            console.error("Invalid buffer length for string decoding");
            return { value: "", size: 0 };
          }
          const stringLength = view.getUint32(offset + 1);
          if (buffer.byteLength < offset + 5 + stringLength) {
            console.error("Invalid string length for buffer size");
            return { value: "", size: 0 };
          }
          const stringBytes = new Uint8Array(buffer, offset + 5, stringLength);
          const decoder = new TextDecoder();
          return { value: decoder.decode(stringBytes), size: 5 + stringLength };

        case RingBuffer.VALUE_TYPE_ARRAY:
          if (buffer.byteLength < offset + 5) {
            console.error("Invalid buffer length for array decoding");
            return { value: [], size: 0 };
          }

          const arrayLength = view.getUint32(offset + 1);
          const result: any[] = [];

          // Check if this is a packed numeric array
          if (buffer.byteLength >= offset + 9 && arrayLength > 0) {
            const elementSize = view.getUint32(offset + 5);

            if (elementSize === 8 && buffer.byteLength >= offset + 9 + arrayLength * 8) {
              // Fast path for numeric arrays
              for (let i = 0; i < arrayLength; i++) {
                result.push(view.getFloat64(offset + 9 + i * 8));
              }
              return { value: result, size: 9 + arrayLength * 8 };
            }
          }

          // Generic array handling
          let currentOffset = offset + 5;
          for (let i = 0; i < arrayLength && currentOffset < buffer.byteLength; i++) {
            const { value: itemValue, size: itemSize } = this.decodeValue(buffer, currentOffset);
            result.push(itemValue);
            currentOffset += itemSize;
          }

          return { value: result, size: currentOffset - offset };

        case RingBuffer.VALUE_TYPE_FLOAT32_ARRAY:
          if (buffer.byteLength < offset + 8) {
            console.error("Invalid buffer length for Float32Array decoding");
            return { value: new Float32Array(0), size: 0 };
          }
          const float32Length = view.getUint32(offset + 1);
          if (buffer.byteLength < offset + 8 + float32Length * 4) {
            console.error("Invalid Float32Array length for buffer size");
            return { value: new Float32Array(0), size: 0 };
          }
          // Slice the buffer directly, ensuring proper alignment
          const float32Data = new Float32Array(buffer, offset + 8, float32Length);
          return { value: float32Data, size: 8 + float32Length * 4 };

        case RingBuffer.VALUE_TYPE_FLOAT64_ARRAY:
          if (buffer.byteLength < offset + 8) {
            console.error("Invalid buffer length for Float64Array decoding");
            return { value: new Float64Array(0), size: 0 };
          }
          const float64Length = view.getUint32(offset + 1);
          if (buffer.byteLength < offset + 8 + float64Length * 8) {
            console.error("Invalid Float64Array length for buffer size");
            return { value: new Float64Array(0), size: 0 };
          }
          // Slice the buffer directly, ensuring proper alignment
          const float64Data = new Float64Array(buffer, offset + 8, float64Length);
          return { value: float64Data, size: 8 + float64Length * 8 };

        case RingBuffer.VALUE_TYPE_INT32_ARRAY:
          if (buffer.byteLength < offset + 8) {
            console.error("Invalid buffer length for Int32Array decoding");
            return { value: new Int32Array(0), size: 0 };
          }
          const int32Length = view.getUint32(offset + 1);
          if (buffer.byteLength < offset + 8 + int32Length * 4) {
            console.error("Invalid Int32Array length for buffer size");
            return { value: new Int32Array(0), size: 0 };
          }
          // Slice the buffer directly, ensuring proper alignment
          const int32Data = new Int32Array(buffer, offset + 8, int32Length);
          return { value: int32Data, size: 8 + int32Length * 4 };

        case RingBuffer.VALUE_TYPE_OBJECT: {
          if (buffer.byteLength < offset + 5) {
            console.error("Invalid buffer length for object decoding");
            return { value: {}, size: 0 };
          }
          const jsonLength = view.getUint32(offset + 1);
          if (buffer.byteLength < offset + 5 + jsonLength) {
            console.error("Invalid JSON length for buffer size");
            return { value: {}, size: 0 };
          }
          const jsonBytes = new Uint8Array(buffer, offset + 5, jsonLength);
          const decoder = new TextDecoder();
          const jsonStr = decoder.decode(jsonBytes);
          try {
            return { value: JSON.parse(jsonStr), size: 5 + jsonLength };
          } catch (e) {
            console.error("Error parsing JSON:", e);
            return { value: {}, size: 0 };
          }
        }
        default:
          console.error("Unknown value type:", valueType);
          return { value: undefined, size: 0 };
      }
    } catch (error) {
      console.error("Error in decodeValue:", error);
      return { value: undefined, size: 0 };
    }
  }

  /**
   * Check if the buffer is available for writing
   * @param bytesNeeded Optional number of bytes we want to write (default: 100)
   */
  // Helper to check if buffer is currently empty
  /**
   * Write an optimized main thread instruction to the buffer
   * Format: {nodeId: string, optimizedDataType: OptimizedDataType, message: number | number[]}
   */
  writeOptimizedMainThreadInstruction(
    nodeId: string,
    data: { optimizedDataType: number; message: number | number[] },
  ): boolean {
    // Determine which buffer to use based on direction
    let writePtr: number, readPtr: number, bufferStart: number, lockOffset: number;

    if (this.direction === BufferDirection.MAIN_TO_WORKER) {
      writePtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR);
      readPtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR);
      bufferStart = RingBuffer.HEADER_SIZE;
      lockOffset = RingBuffer.MAIN_TO_WORKER_LOCK;
    } else {
      writePtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR);
      readPtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR);
      bufferStart = RingBuffer.HEADER_SIZE + this.bufferSize;
      lockOffset = RingBuffer.WORKER_TO_MAIN_LOCK;
    }

    // Try to acquire lock
    if (Atomics.compareExchange(new Uint8Array(this.buffer), lockOffset, 0, 1) !== 0) {
      return false; // Couldn't get lock, another thread is writing
    }

    try {
      // Calculate available space
      let availableSpace: number;
      const bufferEnd = bufferStart + this.bufferSize;

      if (writePtr >= readPtr) {
        // Write pointer is ahead or equal to read pointer
        const wrappedWritePtr = ((writePtr - bufferStart) % this.bufferSize) + bufferStart;
        const wrappedReadPtr = ((readPtr - bufferStart) % this.bufferSize) + bufferStart;

        if (wrappedWritePtr >= wrappedReadPtr) {
          // Normal case: writePtr ahead of readPtr
          availableSpace = bufferEnd - wrappedWritePtr + (wrappedReadPtr - bufferStart) - 1;
        } else {
          // Wrapped case: readPtr ahead of writePtr
          availableSpace = wrappedReadPtr - wrappedWritePtr - 1;
        }
      } else {
        // Read pointer is ahead of write pointer (unusual case)
        availableSpace = readPtr - writePtr - 1;
      }

      // Encode the data based on the optimized data type
      const encoder = new TextEncoder();
      const nodeIdBytes = encoder.encode(nodeId);

      // Message size depends on data type and message
      let messageSize = 0;
      const isArray = Array.isArray(data.message);

      // Storage requirements:
      // 1 byte for message type
      // 2 bytes for nodeId length + nodeId bytes
      // 1 byte for optimizedDataType
      // 4 bytes for array length (if array)
      // 8 bytes per number (Float64 encoding)

      if (isArray) {
        messageSize = 1 + 2 + nodeIdBytes.length + 1 + 4 + (data.message as number[]).length * 8;
      } else {
        messageSize = 1 + 2 + nodeIdBytes.length + 1 + 8; // Single number
      }

      if (messageSize > availableSpace) {
        return false; // Not enough space
      }

      const wrappedWritePtr = ((writePtr - bufferStart) % this.bufferSize) + bufferStart;
      let currentPtr = wrappedWritePtr;

      // Write message type
      this.view.setUint8(currentPtr, MessageType.OPTIMIZED_MAIN_THREAD_INSTRUCTION);
      currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);

      // Write nodeId length
      this.view.setUint16(currentPtr, nodeIdBytes.length);
      currentPtr = this.incrementPointer(currentPtr, 2, bufferStart, bufferEnd);

      // Write nodeId bytes
      for (let i = 0; i < nodeIdBytes.length; i++) {
        this.view.setUint8(currentPtr, nodeIdBytes[i]);
        currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);
      }

      // Write optimized data type
      this.view.setUint8(currentPtr, data.optimizedDataType);
      currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);

      // Write message data based on type
      if (isArray) {
        // Write array length
        this.view.setUint32(currentPtr, (data.message as number[]).length);
        currentPtr = this.incrementPointer(currentPtr, 4, bufferStart, bufferEnd);

        // Write array elements
        for (let i = 0; i < (data.message as number[]).length; i++) {
          this.view.setFloat64(currentPtr, (data.message as number[])[i]);
          currentPtr = this.incrementPointer(currentPtr, 8, bufferStart, bufferEnd);
        }
      } else {
        // Write single number
        this.view.setFloat64(currentPtr, data.message as number);
        currentPtr = this.incrementPointer(currentPtr, 8, bufferStart, bufferEnd);
      }

      // Update the write pointer
      if (this.direction === BufferDirection.MAIN_TO_WORKER) {
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR, currentPtr);
      } else {
        this.view.setUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR, currentPtr);
      }

      // Signal that new data is available
      if (this.signalCallback) {
        this.signalCallback();
      }

      return true;
    } finally {
      // Release the lock
      Atomics.store(new Uint8Array(this.buffer), lockOffset, 0);
    }
  }

  /**
   * Read an optimized publish message from the buffer
   */
  private readOptimizedPublish(
    readPtr: number,
    bufferStart: number,
    bufferEnd: number,
    readPtrOffset: number,
  ): { type: MessageType; nodeId: string; message: any } | undefined {
    try {
      // readPtr is pointing at the message type byte
      // Move to the next byte to read nodeId length
      let currentPtr = this.incrementPointer(readPtr, 1, bufferStart, bufferEnd);

      // Read nodeId length
      const nodeIdLength = this.view.getUint16(currentPtr);
      currentPtr = this.incrementPointer(currentPtr, 2, bufferStart, bufferEnd);

      // Read nodeId bytes
      const nodeIdBytes = new Uint8Array(nodeIdLength);
      for (let i = 0; i < nodeIdLength; i++) {
        nodeIdBytes[i] = this.view.getUint8(currentPtr);
        currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);
      }

      const decoder = new TextDecoder();
      const nodeId = decoder.decode(nodeIdBytes);

      // Read type string length
      const typeStrLength = this.view.getUint16(currentPtr);
      currentPtr = this.incrementPointer(currentPtr, 2, bufferStart, bufferEnd);

      // Read type string bytes
      const typeStrBytes = new Uint8Array(typeStrLength);
      for (let i = 0; i < typeStrLength; i++) {
        typeStrBytes[i] = this.view.getUint8(currentPtr);
        currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);
      }

      const typeStr = decoder.decode(typeStrBytes);

      // Read subType integer
      const subType = this.view.getInt32(currentPtr);
      currentPtr = this.incrementPointer(currentPtr, 4, bufferStart, bufferEnd);

      // Read value float
      const value = this.view.getFloat64(currentPtr);
      currentPtr = this.incrementPointer(currentPtr, 8, bufferStart, bufferEnd);

      // Update read pointer
      this.view.setUint32(readPtrOffset, currentPtr);

      // Format the message as expected by the receiver
      const publishData = {
        type: typeStr,
        subType: subType,
        value: value,
      };

      // Construct a message that matches the expected format
      const reconstructedMessage = {
        type: MessageType.PUBLISH,
        nodeId,
        message: {
          type: typeStr,
          message: [subType, value],
        },
      };

      return reconstructedMessage;
    } catch (error) {
      console.error("Error reading optimized publish message:", error);
      return undefined;
    }
  }

  /**
   * Read an optimized main thread instruction message from the buffer
   */
  private readOptimizedMainThreadInstruction(
    readPtr: number,
    bufferStart: number,
    bufferEnd: number,
    readPtrOffset: number,
  ): { type: MessageType; nodeId: string; message: any } | undefined {
    try {
      // readPtr is pointing at the message type byte
      // Move to the next byte to read nodeId length
      let currentPtr = this.incrementPointer(readPtr, 1, bufferStart, bufferEnd);

      // Read nodeId length
      const nodeIdLength = this.view.getUint16(currentPtr);
      currentPtr = this.incrementPointer(currentPtr, 2, bufferStart, bufferEnd);

      // Read nodeId bytes
      const nodeIdBytes = new Uint8Array(nodeIdLength);
      for (let i = 0; i < nodeIdLength; i++) {
        nodeIdBytes[i] = this.view.getUint8(currentPtr);
        currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);
      }

      const decoder = new TextDecoder();
      const nodeId = decoder.decode(nodeIdBytes);

      // Read optimized data type
      const optimizedDataType = this.view.getUint8(currentPtr);
      currentPtr = this.incrementPointer(currentPtr, 1, bufferStart, bufferEnd);

      // Read message data based on type
      let message: number | number[];

      if (optimizedDataType === 2) {
        // FLOAT_ARRAY
        // Read array length
        const arrayLength = this.view.getUint32(currentPtr);
        currentPtr = this.incrementPointer(currentPtr, 4, bufferStart, bufferEnd);

        // Read array elements
        const numberArray = new Array(arrayLength);
        for (let i = 0; i < arrayLength; i++) {
          numberArray[i] = this.view.getFloat64(currentPtr);
          currentPtr = this.incrementPointer(currentPtr, 8, bufferStart, bufferEnd);
        }
        message = numberArray;
      } else {
        // NUMBER
        // Read single number
        message = this.view.getFloat64(currentPtr);
        currentPtr = this.incrementPointer(currentPtr, 8, bufferStart, bufferEnd);
      }

      // Update read pointer
      this.view.setUint32(readPtrOffset, currentPtr);

      // Return as a mainThreadInstruction with only inlet[0] set
      return {
        type: MessageType.MAIN_THREAD_INSTRUCTION,
        nodeId,
        message: {
          nodeId,
          inletMessages: [message],
        },
      };
    } catch (error) {
      console.error("Error reading optimized main thread instruction:", error);
      return undefined;
    }
  }

  private isBufferEmpty(): boolean {
    if (this.direction === BufferDirection.MAIN_TO_WORKER) {
      const writePtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR);
      const readPtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR);
      return writePtr === readPtr;
    } else {
      const writePtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR);
      const readPtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR);
      return writePtr === readPtr;
    }
  }

  canWrite(bytesNeeded: number = 100): boolean {
    // First check if the lock is available
    let lockOffset: number;

    if (this.direction === BufferDirection.MAIN_TO_WORKER) {
      lockOffset = RingBuffer.MAIN_TO_WORKER_LOCK;
    } else {
      lockOffset = RingBuffer.WORKER_TO_MAIN_LOCK;
    }

    // Check if lock is free
    if (this.view.getUint8(lockOffset) !== 0) {
      return false;
    }

    // Now check if there's enough space
    try {
      // Figure out which pointers to use
      let writePtr: number, readPtr: number, bufferStart: number, bufferEnd: number;

      if (this.direction === BufferDirection.MAIN_TO_WORKER) {
        writePtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR);
        readPtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR);
        bufferStart = RingBuffer.HEADER_SIZE;
      } else {
        writePtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR);
        readPtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR);
        bufferStart = RingBuffer.HEADER_SIZE + this.bufferSize;
      }

      bufferEnd = bufferStart + this.bufferSize;

      // Make sure pointers are valid
      if (
        writePtr < bufferStart ||
        writePtr >= bufferEnd ||
        readPtr < bufferStart ||
        readPtr >= bufferEnd
      ) {
        console.error("Invalid buffer pointers, resetting");
        this.clear();
        return false;
      }

      // Calculate available space
      let availableSpace: number;

      // In ring buffers, we need to fix the problem of distinguishing between empty and full
      // The key issue: when read_ptr == write_ptr, is the buffer empty or full?

      // A simple approach: Consider all buffers to be empty when they start,
      // And only treat them as full when we've written a full buffer's worth of data

      if (readPtr === writePtr) {
        // IMPORTANT FIX: Always treat equal pointers as an empty buffer initially
        // This allows writing to begin at startup. The code will handle detecting
        // a truly full buffer by checking available space during writes.
        return true;
      }

      // Now calculate available space normally
      if (readPtr > writePtr) {
        // Simple case: read pointer is ahead of write pointer
        availableSpace = readPtr - writePtr - 1;
      } else {
        // Write pointer is ahead of read pointer, space wraps around
        availableSpace = bufferEnd - writePtr + (readPtr - bufferStart) - 1;
      }

      // Make sure we have enough space for message + header (5 bytes)
      const hasSpaceAvailable = availableSpace >= bytesNeeded + 5;
      if (!hasSpaceAvailable) {
        console.log(
          "RINGBUFFER: Not enough space available - availableSpace=%s bytesNeeded=%s (including 5 byte header)",
          availableSpace,
          bytesNeeded,
        );

        // Debug full buffer state
        console.log("RINGBUFFER: Buffer state:", {
          direction:
            this.direction === BufferDirection.MAIN_TO_WORKER ? "MAIN_TO_WORKER" : "WORKER_TO_MAIN",
          writePtr,
          readPtr,
          bufferStart,
          bufferEnd,
          pointerDiff: writePtr - readPtr,
          bufferSize: this.bufferSize,
          availableSpace,
          mainToWorkerWritePtr: this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR),
          mainToWorkerReadPtr: this.view.getUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR),
          workerToMainWritePtr: this.view.getUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR),
          workerToMainReadPtr: this.view.getUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR),
        });
      }
      return hasSpaceAvailable;
    } catch (error) {
      console.error("Error checking if buffer can be written to:", error);
      return false;
    }
  }

  /**
   * Check if the buffer has data available for reading
   */
  canRead(): boolean {
    try {
      let writePtr: number, readPtr: number, bufferStart: number, bufferEnd: number;

      if (this.direction === BufferDirection.MAIN_TO_WORKER) {
        // Check worker-to-main buffer
        writePtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR);
        readPtr = this.view.getUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR);
        bufferStart = RingBuffer.HEADER_SIZE + this.bufferSize;
      } else {
        // Check main-to-worker buffer
        writePtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR);
        readPtr = this.view.getUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR);
        bufferStart = RingBuffer.HEADER_SIZE;
      }

      bufferEnd = bufferStart + this.bufferSize;

      /*
      console.log("RINGBUFFER canRead debug:", {
        direction: this.direction === BufferDirection.MAIN_TO_WORKER ? "MAIN_TO_WORKER" : "WORKER_TO_MAIN",
        writePtr,
        readPtr,
        bufferStart,
        bufferEnd,
        pointerDiff: writePtr - readPtr,
      });
      */

      // Make sure pointers are valid
      if (
        writePtr < bufferStart ||
        writePtr >= bufferEnd ||
        readPtr < bufferStart ||
        readPtr >= bufferEnd
      ) {
        console.error("Invalid buffer pointers in canRead, resetting");
        this.clear();
        return false;
      }

      // If read pointer equals write pointer, the buffer is empty
      // This is consistent with our canWrite() implementation
      return readPtr !== writePtr;
    } catch (error) {
      console.error("Error checking if buffer can be read from:", error);
      return false;
    }
  }

  /**
   * Clear the buffer in the current direction
   * @param clearBothDirections If true, clear both buffers regardless of direction
   */
  clear(clearBothDirections: boolean = false): void {
    try {
      // Release any locks first
      if (clearBothDirections || this.direction === BufferDirection.MAIN_TO_WORKER) {
        this.view.setUint8(RingBuffer.MAIN_TO_WORKER_LOCK, 0);
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR, RingBuffer.HEADER_SIZE);
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR, RingBuffer.HEADER_SIZE);
      }

      if (clearBothDirections || this.direction === BufferDirection.WORKER_TO_MAIN) {
        this.view.setUint8(RingBuffer.WORKER_TO_MAIN_LOCK, 0);
        this.view.setUint32(
          RingBuffer.WORKER_TO_MAIN_WRITE_PTR,
          RingBuffer.HEADER_SIZE + this.bufferSize,
        );
        this.view.setUint32(
          RingBuffer.WORKER_TO_MAIN_READ_PTR,
          RingBuffer.HEADER_SIZE + this.bufferSize,
        );
      }
    } catch (error) {
      console.error("Error clearing ring buffer:", error);
    }
  }
}
