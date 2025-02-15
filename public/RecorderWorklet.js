// This is "processor.js" file, evaluated in AudioWorkletGlobalScope upon
// audioWorklet.addModule() call in the main global scope.

const MAX_LENGTH = 41000 * 500;
class RecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();

    this._channelCount = 2;
    this.recBuffers = [[], []];
    this.recLength = 0;
    this.recording = false;
    this.port.onmessage = this.handleMessage_.bind(this);
    this.COUNTER = 0;
  }

  setChannelCount(x) {
    this._channelCount = x;
    this.recBuffers = [];
    for (let i = 0; i < x; i++) {
      this.recBuffers.push([]);
      this.recBuffers.push([]);
    }
  }

  clear() {
    for (let i = 0; i < this.recBuffers.length; i++) {
      this.recBuffers[i].length = 0;
    }
    this.recLength = 0;
  }

  handleMessage_(event) {
    console.log("handle event=", event);
    if (event.data.message === "record") {
      //this.clear();
      console.log("started recording...");
      this.recording = true;
      this.port.postMessage({
        message: {
          type: "record_acknowledged",
        },
      });
      this.needsSecondAck = true;
    } else if (event.data.message === "clear") {
      this.clear();
    } else if (event.data.message === "stop") {
      console.log("stopped recording...");
      this.recording = false;
    } else if (event.data.message === "get_buffer") {
      console.log("getting buffer recording...");
      let buffer = new Float32Array(0); //this.getBuffer();
      // send message
      this.port.postMessage({
        message: {
          type: "get_buffer",
          data: buffer,
        },
      });
    } else if (event.data.message === "flush") {
      // when it receives a flush it sends out all that it has
      this.port.postMessage({
        message: {
          type: "flush",
          data: {
            buffers: this.recBuffers,
            recLength: this.recLength,
          },
        },
      });
      this.clear();
    } else if (event.data.message === "channel-count") {
      this.setChannelCount(event.data.count);
    }

    /*
        console.log('[Processor:Received] ' + event.data.message +
                    ' (' + event.data.contextTimestamp + ')');
                    */
  }

  process(inputs, outputs, parameters) {
    if (this.needsSecondAck) {
      this.port.postMessage({
        message: {
          type: "record_acknowledged2",
        },
      });
      this.needsSecondAck = false;
    }
    this.COUNTER++;
    if (this.recording) {
      for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];
        // console.log('i=%s input=', i, input);
        for (var channel = 0; channel < 2; channel++) {
          let arr = new Float32Array(input[channel % input.length].length);
          arr.set(input[channel % input.length], 0);
          this.recBuffers[2 * i + channel].push(arr);
        }
        if (i === 0) {
          this.recLength += input[0].length;
        }
      }
    }

    if (this.recLength > MAX_LENGTH) {
      cosnole.log("sending chunk because length exceeds max length");
      this.port.postMessage({
        message: {
          type: "chunk",
          data: {
            buffers: this.recBuffers,
            recLength: this.recLength,
          },
        },
      });
      this.clear();
    }
    return true;
  }

  getBuffer() {
    var buffers = [];
    return buffers;
    for (var channel = 0; channel < 2; channel++) {
      buffers.push(this.mergeBuffers(this.recBuffers[channel], this.recLength));
    }

    // then clear to force garbage collection
    this.clear();

    return buffers;
  }

  mergeBuffers(recBuffers, recLength) {
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++) {
      result.set(recBuffers[i], offset);
      offset += recBuffers[i].length;
    }
    return result;
  }
}

registerProcessor("recorder-processor", RecorderWorklet);
