/**
 * 全局日志单例
 * 使用方式：
 *   import { log, initLog } from '@/utils/global-log';
 *   initLog('my-app.log');  // 可选，自定义日志文件名
 *   log('Hello World');     // 直接使用
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

let logFilePath: string;
let isInitialized = false;

/**
 * 初始化全局日志
 * @param logFileName 日志文件名（默认 'app.log'）
 * @param logDir 日志目录（默认为项目根目录的 logs 文件夹）
 */
export function initLog(logFileName: string = 'app.log', logDir?: string) {
  if (isInitialized) {
    return; // 已初始化则跳过
  }

  // 默认日志目录为项目根目录下的 logs 文件夹
  const finalLogDir = logDir || join(process.cwd(), 'logs');
  logFilePath = join(finalLogDir, logFileName);

  // 确保目录存在
  if (!existsSync(finalLogDir)) {
    mkdirSync(finalLogDir, { recursive: true });
  }

  // 追加分隔线
  const separator = '\n' + '='.repeat(60) + '\n';
  const header = `=== Log started at ${new Date().toISOString()} ===\n`;

  // 文件不存在则创建，存在则追加
  if (!existsSync(logFilePath)) {
    writeFileSync(logFilePath, separator + header);
  } else {
    appendFileSync(logFilePath, separator + header);
  }

  isInitialized = true;
}

/**
 * 全局日志函数
 * @param message 日志消息
 * @param printToConsole 是否同时输出到控制台（默认 true）
 */
export function log(message: string, printToConsole: boolean = true): void {
  if (!isInitialized) {
    initLog(); // 自动初始化
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  appendFileSync(logFilePath, logMessage);
  if (printToConsole) {
    console.log(message);
  }
}
