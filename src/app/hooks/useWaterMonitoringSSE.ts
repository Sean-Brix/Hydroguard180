import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

export interface WaterMonitoringRecord {
  id: string;
  waterLevel: number;
  waterLevelUnit: string;
  alertLevel: number;
  rainfallIndicator: string;
  deviceStatus: string;
  notes: string;
  timestamp: string;
}

interface SSEMessage {
  type: 'connected' | 'update';
  message?: string;
  data?: WaterMonitoringRecord;
}

export function useWaterMonitoringSSE(onUpdate: (record: WaterMonitoringRecord) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  // Keep a stable ref so reconnects never trigger when the callback identity changes
  const onUpdateRef = useRef(onUpdate);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let active = true;

    const connect = () => {
      if (!active) return;

      const sseUrl = `${API_BASE_URL.replace('/api', '')}/api/sse/water-monitoring`;
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!active) return;
        setIsConnected(true);
        reconnectDelayRef.current = 1000; // reset backoff on successful connect
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          if (message.type === 'update' && message.data) {
            onUpdateRef.current(message.data);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        if (!active) return;
        setIsConnected(false);
        // Exponential backoff: 1 s → 2 s → 4 s … capped at 30 s
        const delay = Math.min(reconnectDelayRef.current, 30_000);
        reconnectDelayRef.current = delay * 2;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      eventSourceRef.current?.close();
    };
  }, []); // intentionally empty — only connect once; callback kept current via ref

  return { isConnected };
}
