/**
 * SharedMemoryManager - A utility class for managing direct memory access
 * between the main thread and worker threads.
 * 
 * This provides an even faster communication method than the RingBuffer for
 * simple numeric values that need to be shared between threads.
 */

// Fixed offset values for different data blocks
export enum MemoryOffsets {
  // Header (64 bytes reserved)
  TIMESTAMP = 0, // 8 bytes - double precision timestamp for synchronization
  SEQUENCE_NUM = 8, // 4 bytes - sequence number for ensuring data coherence
  
  // Data blocks start at offset 64
  DATA_START = 64,
  
  // System metrics
  MAIN_THREAD_LOAD = 64, // 4 bytes - main thread CPU load (0-100)
  WORKER_THREAD_LOAD = 68, // 4 bytes - worker thread CPU load (0-100)
  MEMORY_USAGE = 72, // 4 bytes - memory usage in MB
  
  // Audio metrics
  AUDIO_BUFFER_SIZE = 76, // 4 bytes - current audio buffer size
  AUDIO_SAMPLE_RATE = 80, // 4 bytes - current sample rate
  AUDIO_DROPOUT_COUNT = 84, // 4 bytes - count of audio dropouts
  
  // Node stats
  ACTIVE_NODE_COUNT = 88, // 4 bytes - number of active nodes
  MESSAGE_COUNT = 92, // 4 bytes - running count of messages processed
  INSTRUCTION_COUNT = 96, // 4 bytes - running count of instructions processed
  
  // Reserved for future use
  // ...
  
  // Custom user data starts at offset 1024
  USER_DATA_START = 1024
}

export class SharedMemoryManager {
  private buffer: SharedArrayBuffer;
  private view: DataView;
  private float32View: Float32Array;
  private float64View: Float64Array;
  private int32View: Int32Array;
  
  /**
   * Create a new SharedMemoryManager
   * @param size Total size of the buffer in bytes
   * @param existingBuffer Optional existing SharedArrayBuffer to use
   */
  constructor(size: number = 8192, existingBuffer?: SharedArrayBuffer) {
    if (existingBuffer) {
      this.buffer = existingBuffer;
    } else {
      this.buffer = new SharedArrayBuffer(size);
      
      // Initialize header values
      const view = new DataView(this.buffer);
      view.setFloat64(MemoryOffsets.TIMESTAMP, performance.now());
      view.setInt32(MemoryOffsets.SEQUENCE_NUM, 0);
    }
    
    // Create views for efficient access
    this.view = new DataView(this.buffer);
    this.float32View = new Float32Array(this.buffer);
    this.float64View = new Float64Array(this.buffer);
    this.int32View = new Int32Array(this.buffer);
  }
  
  /**
   * Get the underlying SharedArrayBuffer
   */
  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }
  
  /**
   * Update the timestamp to indicate the memory has been updated
   */
  updateTimestamp(): void {
    this.view.setFloat64(MemoryOffsets.TIMESTAMP, performance.now());
    Atomics.add(this.int32View, MemoryOffsets.SEQUENCE_NUM / 4, 1);
  }
  
  /**
   * Get the last update timestamp
   */
  getTimestamp(): number {
    return this.view.getFloat64(MemoryOffsets.TIMESTAMP);
  }
  
  /**
   * Get the sequence number
   */
  getSequenceNumber(): number {
    return Atomics.load(this.int32View, MemoryOffsets.SEQUENCE_NUM / 4);
  }
  
  /**
   * Set a float32 value at the specified offset
   */
  setFloat32(offset: number, value: number): void {
    this.view.setFloat32(offset, value);
  }
  
  /**
   * Get a float32 value from the specified offset
   */
  getFloat32(offset: number): number {
    return this.view.getFloat32(offset);
  }
  
  /**
   * Set a float64 value at the specified offset
   */
  setFloat64(offset: number, value: number): void {
    this.view.setFloat64(offset, value);
  }
  
  /**
   * Get a float64 value from the specified offset
   */
  getFloat64(offset: number): number {
    return this.view.getFloat64(offset);
  }
  
  /**
   * Set an int32 value at the specified offset
   */
  setInt32(offset: number, value: number): void {
    this.view.setInt32(offset, value);
  }
  
  /**
   * Get an int32 value from the specified offset
   */
  getInt32(offset: number): number {
    return this.view.getInt32(offset);
  }
  
  /**
   * Atomically add to an int32 value and return the result
   */
  addInt32(offset: number, value: number): number {
    const index = offset / 4; // Convert byte offset to int32 index
    return Atomics.add(this.int32View, index, value);
  }
  
  /**
   * Atomically exchange an int32 value and return the old value
   */
  exchangeInt32(offset: number, value: number): number {
    const index = offset / 4; // Convert byte offset to int32 index
    return Atomics.exchange(this.int32View, index, value);
  }
  
  /**
   * Set a Float32Array at a specified offset
   */
  setFloat32Array(offset: number, array: Float32Array | number[]): void {
    const destArray = new Float32Array(this.buffer, offset, array.length);
    destArray.set(array);
  }
  
  /**
   * Get a Float32Array view at a specified offset
   */
  getFloat32Array(offset: number, length: number): Float32Array {
    return new Float32Array(this.buffer, offset, length);
  }
  
  /**
   * Track a CPU load measurement (0-100 scale)
   * @param isWorker Whether this is the worker thread reporting (true) or main thread (false)
   * @param load CPU load value (0-100)
   */
  reportCPULoad(isWorker: boolean, load: number): void {
    const offset = isWorker ? MemoryOffsets.WORKER_THREAD_LOAD : MemoryOffsets.MAIN_THREAD_LOAD;
    this.setFloat32(offset, load);
  }
  
  /**
   * Report memory usage in MB
   */
  reportMemoryUsage(memoryMB: number): void {
    this.setFloat32(MemoryOffsets.MEMORY_USAGE, memoryMB);
  }
  
  /**
   * Report audio metrics
   */
  reportAudioMetrics(bufferSize: number, sampleRate: number): void {
    this.setInt32(MemoryOffsets.AUDIO_BUFFER_SIZE, bufferSize);
    this.setInt32(MemoryOffsets.AUDIO_SAMPLE_RATE, sampleRate);
  }
  
  /**
   * Report an audio dropout
   * @returns The new dropout count
   */
  reportAudioDropout(): number {
    return this.addInt32(MemoryOffsets.AUDIO_DROPOUT_COUNT, 1);
  }
  
  /**
   * Update node statistics
   */
  updateNodeStats(activeNodeCount: number): void {
    this.setInt32(MemoryOffsets.ACTIVE_NODE_COUNT, activeNodeCount);
  }
  
  /**
   * Report a message being processed
   * @returns The new message count
   */
  reportMessageProcessed(count: number = 1): number {
    return this.addInt32(MemoryOffsets.MESSAGE_COUNT, count);
  }
  
  /**
   * Report instructions being processed
   * @returns The new instruction count
   */
  reportInstructionsProcessed(count: number = 1): number {
    return this.addInt32(MemoryOffsets.INSTRUCTION_COUNT, count);
  }
  
  /**
   * Get performance metrics as an object
   */
  getPerformanceMetrics(): {
    mainThreadLoad: number;
    workerThreadLoad: number;
    memoryUsageMB: number;
    audioBufferSize: number;
    audioSampleRate: number;
    audioDropoutCount: number;
    activeNodeCount: number;
    messageCount: number;
    instructionCount: number;
  } {
    return {
      mainThreadLoad: this.getFloat32(MemoryOffsets.MAIN_THREAD_LOAD),
      workerThreadLoad: this.getFloat32(MemoryOffsets.WORKER_THREAD_LOAD),
      memoryUsageMB: this.getFloat32(MemoryOffsets.MEMORY_USAGE),
      audioBufferSize: this.getInt32(MemoryOffsets.AUDIO_BUFFER_SIZE),
      audioSampleRate: this.getInt32(MemoryOffsets.AUDIO_SAMPLE_RATE),
      audioDropoutCount: this.getInt32(MemoryOffsets.AUDIO_DROPOUT_COUNT),
      activeNodeCount: this.getInt32(MemoryOffsets.ACTIVE_NODE_COUNT),
      messageCount: this.getInt32(MemoryOffsets.MESSAGE_COUNT),
      instructionCount: this.getInt32(MemoryOffsets.INSTRUCTION_COUNT)
    };
  }
  
  /**
   * Reset performance counters (keeps cumulative counters like dropouts)
   */
  resetPerformanceCounters(): void {
    this.setFloat32(MemoryOffsets.MAIN_THREAD_LOAD, 0);
    this.setFloat32(MemoryOffsets.WORKER_THREAD_LOAD, 0);
    this.setInt32(MemoryOffsets.ACTIVE_NODE_COUNT, 0);
  }
}