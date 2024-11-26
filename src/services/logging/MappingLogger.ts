import { Transaction } from "../../types/Transaction";

export type MappingLogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface MappingLogEntry {
  timestamp: Date;
  level: MappingLogLevel;
  message: string;
  transactionId?: string;
  details?: any;
  stage: 'validation' | 'mapping' | 'override' | 'approval';
}

class MappingLogger {
  private logs: MappingLogEntry[] = [];
  private static instance: MappingLogger;

  private constructor() {}

  static getInstance(): MappingLogger {
    if (!MappingLogger.instance) {
      MappingLogger.instance = new MappingLogger();
    }
    return MappingLogger.instance;
  }

  private log(level: MappingLogLevel, message: string, stage: MappingLogEntry['stage'], transactionId?: string, details?: any) {
    if (!stage) {
      throw new Error('Stage is required');
    }
    const entry: MappingLogEntry = {
      timestamp: new Date(),
      level,
      message,
      stage,
      transactionId,
      details
    };
    
    this.logs.push(entry);
    
    // Also log to console for development
    const consoleMsg = `[${entry.stage.toUpperCase()}] ${entry.message}${transactionId ? ` (TX: ${transactionId})` : ''}`;
    switch (level) {
      case 'error':
        console.error(consoleMsg, details || '');
        break;
      case 'warning':
        console.warn(consoleMsg, details || '');
        break;
      case 'debug':
        console.debug(consoleMsg, details || '');
        break;
      default:
        console.log(consoleMsg, details || '');
    }
  }

  info(message: string, stage: MappingLogEntry['stage'], transactionId?: string, details?: any) {
    this.log('info', message, stage, transactionId, details);
  }

  warning(message: string, stage: MappingLogEntry['stage'], transactionId?: string, details?: any) {
    this.log('warning', message, stage, transactionId, details);
  }

  error(message: string, stage: MappingLogEntry['stage'], transactionId?: string, details?: any) {
    this.log('error', message, stage, transactionId, details);
  }

  debug(message: string, stage: MappingLogEntry['stage'], transactionId?: string, details?: any) {
    this.log('debug', message, stage, transactionId, details);
  }

  getLogsForTransaction(transactionId: string): MappingLogEntry[] {
    return this.logs.filter(log => log.transactionId === transactionId);
  }

  getAllLogs(): MappingLogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  getSummary(): { total: number; errors: number; warnings: number; successful: number } {
    return this.logs.reduce((acc, log) => {
      acc.total++;
      if (log.level === 'error') acc.errors++;
      if (log.level === 'warning') acc.warnings++;
      if (log.level === 'info') acc.successful++;
      return acc;
    }, { total: 0, errors: 0, warnings: 0, successful: 0 });
  }
}

export const mappingLogger = MappingLogger.getInstance();
