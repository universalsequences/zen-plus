// BidirectionalRingBuffer for efficient message passing between threads
// Uses a SharedArrayBuffer and DataView for efficient, type-safe messaging

// Message type identifiers
export enum MessageType {
  // Main-to-Worker message types
  EVALUATE_NODE = 1,
  UPDATE_OBJECT = 2,
  UPDATE_MESSAGE = 3,
  LOADBANG = 4,
  PUBLISH = 5,
  ATTRUI = 6,
  SET_COMPILATION = 7,
  
  // Worker-to-Main message types
  MAIN_THREAD_INSTRUCTION = 101,
  NEW_SHARED_BUFFER = 102,
  NEW_VALUE = 103,
  REPLACE_MESSAGE = 104,
  ATTRIBUTE_UPDATE = 105
}

// Buffer directions
export enum BufferDirection {
  MAIN_TO_WORKER = 0,
  WORKER_TO_MAIN = 1
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
  constructor(sizeInBytes: number, existingBuffer?: SharedArrayBuffer, direction: BufferDirection = BufferDirection.MAIN_TO_WORKER) {
    if (existingBuffer) {
      // Use existing buffer (e.g., when worker receives the buffer from main thread)
      this.buffer = existingBuffer;
      this.view = new DataView(this.buffer);
      this.bufferSize = this.view.getUint32(RingBuffer.BUFFER_SIZE);
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
      this.view.setUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR, RingBuffer.HEADER_SIZE + sizeInBytes);
      this.view.setUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR, RingBuffer.HEADER_SIZE + sizeInBytes);
      this.view.setUint32(RingBuffer.BUFFER_SIZE, sizeInBytes);
      this.view.setUint8(RingBuffer.MAIN_TO_WORKER_LOCK, 0);
      this.view.setUint8(RingBuffer.WORKER_TO_MAIN_LOCK, 0);
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
   * Writes a message to the ring buffer in the current direction
   * Returns true if the message was written successfully
   */
  write(type: MessageType, nodeId: string, message?: any): boolean {
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
        const lengthPtr = (wrappedWritePtr + 1) % this.bufferSize + bufferStart;
        if (lengthPtr + 4 <= bufferEnd) {
          // Length fits without wrapping
          this.view.setUint32(lengthPtr, messageLength);
        } else {
          // Length wraps around buffer end
          const bytesAtEnd = bufferEnd - lengthPtr;
          for (let i = 0; i < bytesAtEnd; i++) {
            this.view.setUint8(lengthPtr + i, (messageLength >> (8 * i)) & 0xFF);
          }
          for (let i = 0; i < 4 - bytesAtEnd; i++) {
            this.view.setUint8(bufferStart + i, (messageLength >> (8 * (bytesAtEnd + i))) & 0xFF);
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
            new Uint8Array(encodedMessage, 0, part1Length)
          );
          
          // Part 2: Write remaining data at the beginning of the buffer
          const part2Length = messageLength - part1Length;
          
          // Validate part2Length
          if (part2Length <= 0 || part2Length > this.bufferSize) {
            throw new Error(`Invalid part2Length for writing: ${part2Length}`);
          }
          
          new Uint8Array(this.buffer, bufferStart, part2Length).set(
            new Uint8Array(encodedMessage, part1Length, part2Length)
          );
        } else {
          // Message fits without wrapping
          new Uint8Array(this.buffer, messageStart, messageLength).set(
            new Uint8Array(encodedMessage)
          );
        }
      } catch (error) {
        console.error('Error writing to ring buffer:', error);
        console.error('Debug info:', { 
          writePtr, 
          readPtr,
          wrappedWritePtr,
          messageLength, 
          bufferStart, 
          bufferEnd,
          bufferSize: this.bufferSize,
          totalBufferSize: this.buffer.byteLength
        });
        return false;
      }
      
      // Update the write pointer atomically
      const newWritePtr = (wrappedWritePtr + messageHeaderSize + messageLength) % this.bufferSize + bufferStart;
      
      if (this.direction === BufferDirection.MAIN_TO_WORKER) {
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_WRITE_PTR, newWritePtr);
      } else {
        this.view.setUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR, newWritePtr);
      }
      
      return true;
    } finally {
      // Release lock
      Atomics.store(new Uint8Array(this.buffer), lockOffset, 0);
    }
  }
  
  /**
   * Reads a message from the ring buffer in the opposite direction
   * Returns undefined if no message is available
   */
  read(): { type: MessageType; nodeId: string; message: any } | undefined {
    // Determine which buffer to read from (opposite of the direction we write to)
    let writePtr: number, readPtr: number, bufferStart: number, readPtrOffset: number, lockOffset: number;
    
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
      
      const bufferEnd = bufferStart + this.bufferSize;
      const wrappedReadPtr = ((readPtr - bufferStart) % this.bufferSize) + bufferStart;
      
      // Read the message type
      const type = this.view.getUint8(wrappedReadPtr) as MessageType;
      
      // Read the message length
      const lengthPtr = (wrappedReadPtr + 1) % this.bufferSize + bufferStart;
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
        if (this.direction === BufferDirection.MAIN_TO_WORKER) {
          this.view.setUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR, writePtr);
        } else {
          this.view.setUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR, writePtr);
        }
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
            new Uint8Array(this.buffer, messageStart, part1Length)
          );
          
          // Part 2: Read remaining from beginning of buffer
          const part2Length = messageLength - part1Length;
          
          // Double-check that part2Length is valid
          if (part2Length <= 0 || part2Length > this.bufferSize) {
            throw new Error(`Invalid part2Length: ${part2Length}`);
          }
          
          new Uint8Array(messageBuffer, part1Length, part2Length).set(
            new Uint8Array(this.buffer, bufferStart, part2Length)
          );
        } else {
          // Message fits without wrapping
          new Uint8Array(messageBuffer).set(
            new Uint8Array(this.buffer, messageStart, messageLength)
          );
        }
      } catch (error) {
        console.error('Error reading from ring buffer:', error);
        console.error('Debug info:', { 
          messageStart, 
          messageLength, 
          bufferStart, 
          bufferEnd,
          bufferSize: this.bufferSize,
          totalBufferSize: this.buffer.byteLength
        });
        
        // Reset the read pointer to avoid getting stuck in a bad state
        if (this.direction === BufferDirection.MAIN_TO_WORKER) {
          this.view.setUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR, writePtr);
        } else {
          this.view.setUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR, writePtr);
        }
        return undefined;
      }
      
      // Update the read pointer
      const newReadPtr = (wrappedReadPtr + messageHeaderSize + messageLength) % this.bufferSize + bufferStart;
      
      if (this.direction === BufferDirection.MAIN_TO_WORKER) {
        this.view.setUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR, newReadPtr);
      } else {
        this.view.setUint32(RingBuffer.MAIN_TO_WORKER_READ_PTR, newReadPtr);
      }
      
      // Decode message
      return this.decodeMessage(messageBuffer, type);
    } finally {
      // Release lock
      Atomics.store(new Uint8Array(this.buffer), lockOffset, 0);
    }
  }
  
  /**
   * Encode a message for writing to the buffer
   */
  private encodeMessage(type: MessageType, nodeId: string, message?: any): ArrayBuffer {
    // First, convert nodeId to UTF-8 bytes
    const encoder = new TextEncoder();
    const nodeIdBytes = encoder.encode(nodeId);
    
    // Calculate the size of the message
    let messageBodySize = 0;
    let messageBodyBuffer: ArrayBuffer | null = null;
    
    if (message !== undefined) {
      const serialized = JSON.stringify(message);
      messageBodyBuffer = encoder.encode(serialized).buffer;
      messageBodySize = messageBodyBuffer.byteLength;
    }
    
    // Total message size: nodeId length (2 bytes) + nodeId bytes + message length (4 bytes) + message body
    const totalSize = 2 + nodeIdBytes.length + 4 + messageBodySize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
    // Write nodeId length
    view.setUint16(0, nodeIdBytes.length);
    
    // Write nodeId bytes
    new Uint8Array(buffer, 2, nodeIdBytes.length).set(nodeIdBytes);
    
    // Write message length
    view.setUint32(2 + nodeIdBytes.length, messageBodySize);
    
    // Write message body if present
    if (messageBodyBuffer && messageBodySize > 0) {
      new Uint8Array(buffer, 6 + nodeIdBytes.length, messageBodySize).set(
        new Uint8Array(messageBodyBuffer)
      );
    }
    
    return buffer;
  }
  
  /**
   * Decode a message from the buffer
   */
  private decodeMessage(buffer: ArrayBuffer, type: MessageType): { type: MessageType; nodeId: string; message: any } {
    const decoder = new TextDecoder();
    const view = new DataView(buffer);
    
    // Read nodeId
    const nodeIdLength = view.getUint16(0);
    const nodeIdBytes = new Uint8Array(buffer, 2, nodeIdLength);
    const nodeId = decoder.decode(nodeIdBytes);
    
    // Read message
    const messageLength = view.getUint32(2 + nodeIdLength);
    let message: any = undefined;
    
    if (messageLength > 0) {
      const messageBytes = new Uint8Array(buffer, 6 + nodeIdLength, messageLength);
      const messageStr = decoder.decode(messageBytes);
      message = JSON.parse(messageStr);
    }
    
    return { type, nodeId, message };
  }
  
  /**
   * Check if the buffer is available for writing
   * @param bytesNeeded Optional number of bytes we want to write (default: 100)
   */
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
      if (writePtr < bufferStart || writePtr >= bufferEnd ||
          readPtr < bufferStart || readPtr >= bufferEnd) {
        console.error('Invalid buffer pointers, resetting');
        this.clear();
        return false;
      }
      
      // Calculate available space
      let availableSpace: number;
      
      if (readPtr > writePtr) {
        // Simple case: read pointer is ahead of write pointer
        availableSpace = readPtr - writePtr - 1;
      } else if (readPtr === writePtr) {
        // Buffer is either completely empty or completely full
        // Since we're checking canWrite(), we'll assume it's full
        return false;
      } else {
        // Write pointer is ahead of read pointer, space wraps around
        availableSpace = (bufferEnd - writePtr) + (readPtr - bufferStart) - 1;
      }
      
      // Make sure we have enough space for message + header (5 bytes)
      return availableSpace >= (bytesNeeded + 5);
    } catch (error) {
      console.error('Error checking if buffer can be written to:', error);
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
      
      // Make sure pointers are valid
      if (writePtr < bufferStart || writePtr >= bufferEnd ||
          readPtr < bufferStart || readPtr >= bufferEnd) {
        console.error('Invalid buffer pointers in canRead, resetting');
        this.clear();
        return false;
      }
      
      return readPtr !== writePtr;
    } catch (error) {
      console.error('Error checking if buffer can be read from:', error);
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
        this.view.setUint32(RingBuffer.WORKER_TO_MAIN_WRITE_PTR, RingBuffer.HEADER_SIZE + this.bufferSize);
        this.view.setUint32(RingBuffer.WORKER_TO_MAIN_READ_PTR, RingBuffer.HEADER_SIZE + this.bufferSize);
      }
      
      console.log('Ring buffer cleared');
    } catch (error) {
      console.error('Error clearing ring buffer:', error);
    }
  }
}