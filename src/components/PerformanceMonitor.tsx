import React from 'react';
import usePerformanceMetrics from '@/hooks/usePerformanceMetrics';

interface PerformanceMonitorProps {
  showDetailed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A component to display real-time performance metrics of the Zen+ engine
 */
export function PerformanceMonitor({ 
  showDetailed = false, 
  className = '',
  style = {} 
}: PerformanceMonitorProps) {
  const metrics = usePerformanceMetrics(500); // Update every 500ms
  
  // Format numbers for display - safely handle undefined/null
  const fmt = (num: number | undefined | null) => {
    if (num === undefined || num === null) return 'N/A';
    return Math.round(num).toLocaleString();
  };
  
  // Check if SharedArrayBuffer is supported
  const isSharedBufferSupported = typeof SharedArrayBuffer !== 'undefined';
  
  // If shared buffer isn't supported, show limited information
  if (!isSharedBufferSupported) {
    return (
      <div 
        className={`p-2 rounded-md bg-black/80 text-white text-xs font-mono ${className}`}
        style={{ 
          position: 'fixed', 
          bottom: '1rem', 
          right: '1rem',
          zIndex: 9999,
          ...style 
        }}
      >
        <div className="text-center">
          Performance metrics unavailable
          <div className="text-xs opacity-70 mt-1">
            SharedArrayBuffer not supported
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`p-2 rounded-md bg-black/80 text-white text-xs font-mono ${className}`}
      style={{ 
        position: 'fixed', 
        bottom: '1rem', 
        right: '1rem',
        zIndex: 9999,
        ...style 
      }}
    >
      <div className="flex justify-between gap-4">
        <div>CPU:</div>
        <div>
          Main: {fmt(metrics.mainThreadLoad)}% | Worker: {fmt(metrics.workerThreadLoad)}%
        </div>
      </div>
      
      <div className="flex justify-between gap-4">
        <div>Memory:</div>
        <div>{fmt(metrics.memoryUsageMB)} MB</div>
      </div>
      
      <div className="flex justify-between gap-4">
        <div>Nodes:</div>
        <div>{fmt(metrics.activeNodeCount)}</div>
      </div>
      
      <div className="flex justify-between gap-4">
        <div>Msg Rate:</div>
        <div>{fmt(metrics.messagesPerSecond)}/s</div>
      </div>
      
      {showDetailed && (
        <>
          <div className="mt-2 border-t border-white/20 pt-1">
            <div className="flex justify-between gap-4">
              <div>Audio:</div>
              <div>
                {metrics.audioSampleRate}Hz / {metrics.audioBufferSize} samples
              </div>
            </div>
            
            <div className="flex justify-between gap-4">
              <div>Dropouts:</div>
              <div>{metrics.audioDropoutCount}</div>
            </div>
            
            <div className="flex justify-between gap-4">
              <div>Instr Rate:</div>
              <div>{fmt(metrics.instructionsPerSecond)}/s</div>
            </div>
            
            <div className="flex justify-between gap-4">
              <div>Total Msgs:</div>
              <div>{fmt(metrics.messageCount)}</div>
            </div>
            
            <div className="flex justify-between gap-4">
              <div>Total Instr:</div>
              <div>{fmt(metrics.instructionCount)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PerformanceMonitor;