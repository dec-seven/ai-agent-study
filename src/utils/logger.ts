import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

/**
 * 创建日志记录器
 * @param logFileName 日志文件名（默认 'app.log'）
 * @param logDir 日志文件所在目录（默认为当前工作目录）
 * @returns 日志函数
 */
export function createLogger(logFileName: string = 'app.log', logDir?: string) {
  const finalLogDir = logDir || process.cwd();
  const logFilePath = join(finalLogDir, logFileName);

  // 确保目录存在
  if (!existsSync(finalLogDir)) {
    mkdirSync(finalLogDir, { recursive: true });
  }

  // 追加分隔线（不清空已有日志）
  const separator = '\n' + '='.repeat(60) + '\n';
  const header = `=== Log started at ${new Date().toISOString()} ===\n`;

  // 文件不存在则创建，存在则追加
  if (!existsSync(logFilePath)) {
    writeFileSync(logFilePath, separator + header);
  } else {
    appendFileSync(logFilePath, separator + header);
  }

  /**
   * 写入日志
   * @param message 日志消息
   * @param printToConsole 是否同时输出到控制台（默认 true）
   */
  return function log(message: string, printToConsole: boolean = true): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    appendFileSync(logFilePath, logMessage);
    if (printToConsole) {
      console.log(message);
    }
  };
}

/**
 * 创建一个与调用文件同级的日志记录器
 * @param callerDir 调用文件的目录路径
 * @param logFileName 日志文件名
 * @returns 日志函数
 */
export function createLocalLogger(callerDir: string, logFileName: string = 'app.log') {
  const logFilePath = join(callerDir, logFileName);

  // 追加分隔线（不清空已有日志）
  const separator = '\n' + '='.repeat(60) + '\n';
  const header = `=== Log started at ${new Date().toISOString()} ===\n`;

  // 文件不存在则创建，存在则追加
  if (!existsSync(logFilePath)) {
    writeFileSync(logFilePath, separator + header);
  } else {
    appendFileSync(logFilePath, separator + header);
  }

  /**
   * 写入日志
   * @param message 日志消息
   * @param printToConsole 是否同时输出到控制台（默认 true）
   */
  return function log(message: string, printToConsole: boolean = true): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    appendFileSync(logFilePath, logMessage);
    if (printToConsole) {
      console.log(message);
    }
  };
}

/**
 * 创建一个自动检测调用者目录的日志记录器
 * 通过调用栈自动获取调用文件所在目录
 * @param logFileName 日志文件名
 * @returns 日志函数
 */
export function createAutoLogger(logFileName: string = 'app.log') {
  // 获取调用栈
  const stack = new Error().stack;
  if (!stack) {
    throw new Error('无法获取调用栈');
  }

  // 解析调用者文件路径
  // 栈格式通常为：Error\n    at Object.<anonymous> (/path/to/file.ts:1:1)\n    at ...
  // 我们需要第3行（第1行是Error，第2行是当前函数，第3行是调用者）
  const lines = stack.split('\n');
  // 尝试找到第一个包含文件路径的行（跳过当前函数）
  let callerPath = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 匹配文件路径格式 (file://...) 或 (/path/to/file.ts)
    const fileUrlMatch = line.match(/\(file:\/\/(\/[^):]+)\)/);
    const filePathMatch = line.match(/\((\/[^):]+)\)/);

    if (fileUrlMatch) {
      callerPath = fileUrlMatch[1];
      break;
    } else if (filePathMatch) {
      callerPath = filePathMatch[1];
      break;
    }
  }

  if (!callerPath) {
    throw new Error('无法解析调用者路径');
  }

  // 从文件路径中提取目录
  const callerDir = dirname(callerPath);
  return createLocalLogger(callerDir, logFileName);
}
