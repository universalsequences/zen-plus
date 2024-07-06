import React, { useEffect, useRef } from "react";
import { useValue } from "@/contexts/ValueContext";

export const Waveform = () => {
  const { value } = useValue();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const drawWaveform = (array: Float32Array) => {
      if (!ctx) return;
      console.log("drawing canvas");
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      const sliceWidth = width / array.length;
      let x = 0;
      for (let i = 0; i < array.length; i++) {
        const v = array[i] * 0.5 + 0.5; // Normalize to 0-1 range
        const y = v * height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    if (value && ArrayBuffer.isView(value) && value.length) {
      if (!canvas.parentElement || !ctx) {
        return;
      }
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
      ctx.strokeStyle = "#00f";
      ctx.lineWidth = 2;
      drawWaveform(value as Float32Array);
    }
  }, [value]);

  return (
    <div style={{ width: "100%", height: "150px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
