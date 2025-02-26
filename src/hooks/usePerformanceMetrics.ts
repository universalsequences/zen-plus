import { useState, useEffect } from 'react';
import { useWorker } from '@/contexts/WorkerContext';

/**
 * Hook that provides real-time performance metrics from the worker thread
 * @param updateInterval How often to update the metrics (in ms)
 * @returns Current performance metrics
 */
export function usePerformanceMetrics(updateInterval = 1000) {
  const worker = useWorker();
  const [metrics, setMetrics] = useState({
    mainThreadLoad: 0,
    workerThreadLoad: 0,
    memoryUsageMB: 0,
    audioBufferSize: 0,
    audioSampleRate: 0,
    audioDropoutCount: 0,
    activeNodeCount: 0,
    messageCount: 0,
    instructionCount: 0,
    
    // Derived metrics
    messagesPerSecond: 0,
    instructionsPerSecond: 0,
  });
  
  // Keep previous message/instruction counts to calculate rate
  const [prevCounts, setPrevCounts] = useState({
    messageCount: 0,
    instructionCount: 0,
    timestamp: Date.now()
  });
  
  useEffect(() => {
    let intervalId: number;
    
    const updateMetrics = () => {
      try {
        const currentMetrics = worker.getPerformanceMetrics();
        
        if (currentMetrics) {
          // Calculate per-second rates
          const now = Date.now();
          const elapsedSeconds = (now - prevCounts.timestamp) / 1000;
          
          const messagesPerSecond = 
            elapsedSeconds > 0 
              ? (currentMetrics.messageCount - prevCounts.messageCount) / elapsedSeconds
              : 0;
              
          const instructionsPerSecond = 
            elapsedSeconds > 0 
              ? (currentMetrics.instructionCount - prevCounts.instructionCount) / elapsedSeconds
              : 0;
          
          // Update previous counts for next calculation
          setPrevCounts({
            messageCount: currentMetrics.messageCount,
            instructionCount: currentMetrics.instructionCount,
            timestamp: now
          });
          
          // Update all metrics including derived ones
          setMetrics({
            ...currentMetrics,
            messagesPerSecond,
            instructionsPerSecond
          });
        }
      } catch (error) {
        console.error('Error updating performance metrics:', error);
        // Continue silently - we'll try again next interval
      }
    };
    
    // Initial update
    updateMetrics();
    
    // Set up interval
    intervalId = window.setInterval(updateMetrics, updateInterval);
    
    return () => {
      window.clearInterval(intervalId);
    };
  }, [worker, updateInterval, prevCounts]);
  
  return metrics;
}

export default usePerformanceMetrics;