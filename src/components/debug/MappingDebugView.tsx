import React, { useEffect, useState } from 'react';
import { mappingLogger, MappingLogEntry } from '../../services/logging/MappingLogger';

export const MappingDebugView: React.FC = () => {
  const [logs, setLogs] = useState<MappingLogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const updateLogs = () => {
      setLogs(mappingLogger.getAllLogs());
    };

    updateLogs();
    
    if (autoRefresh) {
      const interval = setInterval(updateLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const summary = mappingLogger.getSummary();

  const getLevelColor = (level: MappingLogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'debug': return 'text-gray-600';
    }
  };

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-white border-l border-t shadow-lg overflow-hidden flex flex-col">
      <div className="p-2 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold">Mapping Debug</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-1"
            />
            Auto-refresh
          </label>
          <button
            onClick={() => mappingLogger.clearLogs()}
            className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="p-2 border-b bg-gray-50 grid grid-cols-4 gap-2 text-sm">
        <div className="text-center">
          <div className="font-semibold">Total</div>
          <div>{summary.total}</div>
        </div>
        <div className="text-center text-green-600">
          <div className="font-semibold">Success</div>
          <div>{summary.successful}</div>
        </div>
        <div className="text-center text-yellow-600">
          <div className="font-semibold">Warnings</div>
          <div>{summary.warnings}</div>
        </div>
        <div className="text-center text-red-600">
          <div className="font-semibold">Errors</div>
          <div>{summary.errors}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="divide-y">
          {logs.map((log, i) => (
            <div key={i} className="p-2 text-sm hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${getLevelColor(log.level)}`}>
                  [{log.stage.toUpperCase()}] {log.level.toUpperCase()}
                </span>
                <span className="text-gray-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div>{log.message}</div>
              {log.transactionId && (
                <div className="text-gray-500 text-xs">TX: {log.transactionId}</div>
              )}
              {log.details && (
                <pre className="mt-1 text-xs bg-gray-100 p-1 rounded">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
