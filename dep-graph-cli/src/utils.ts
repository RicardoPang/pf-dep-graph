import path from 'path'
import fs from 'fs/promises'
import { ILockFileOptions } from './type'

// 项目根目录
const projectRoot = process.cwd()

// 读取package.json
export async function getProjectPakcageJson(packageJsonPath?: string) {
  if (!packageJsonPath) {
    packageJsonPath = path.join(projectRoot, 'package.json')
  }
  try {
    const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonRaw)
    return packageJson
  } catch (error) {
    console.error('读取package.json时发生错误:', error)
    return null
  }
}

// 获取项目锁文件内容, 并根据锁文件类型选择相应的处理类进行处理
export async function getProjectLockFile(): Promise<
  ILockFileOptions | undefined
> {
  // 定义需要检查的锁文件列表
  const lockFiles = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json']
  try {
    for (const lockFile of lockFiles) {
      try {
        // 读取锁文件内容和锁文件路径
        const lockPath = await readPkgPath(lockFile)
        const lockFileContent = await fs.readFile(lockPath, 'utf-8')
        return { name: lockFile, content: lockFileContent, lockPath }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`读取 ${lockFile} 时发生错误:`, error)
          throw error
        }
      }
    }

    // 如果没有找到合适的锁文件，返回 undefined
    return undefined
  } catch (error) {
    console.error('读取文件时发生错误:', error)
    throw error
  }
}

// 配置信息路径
export const readPkgPath = async (suffix = 'package.json'): Promise<string> => {
  const filePath = path.join(projectRoot, suffix)
  return filePath
}

// 配置信息
export const readPackageJson = async (path?: string): Promise<any> => {
  try {
    let filePath = ''
    if (path) {
      filePath = path
    } else {
      filePath = await readPkgPath()
    }
    const pkg = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(pkg)
  } catch (error) {
    console.error('Error reading package.json:', error)
    return null
  }
}

// 读取版本号
export const readVersion = async (): Promise<string> => {
  const pkgPath = path.join(__dirname, '../package.json')
  const packageJson = await readPackageJson(pkgPath)
  return packageJson?.version || ''
}

// 服务端口
export const PORT = 3000

// 前端端口
export const CLIENT_PORT = 8080

// 响应头
export const HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

// 判断是否为对象
export const isObject = (val: any): boolean =>
  val !== null && typeof val === 'object'

// 判断是否为数组
export const isArray = (val: any): boolean => Array.isArray(val)

// 配置指令命令
export const mapActions = {
  analyze: {
    alias: 'ana',
    description: '分析模块依赖关系',
    examples: ['dep-graph-cli analyze'],
    options: [
      {
        flag: '-d, --depth <n>',
        description: '限制向下递归分析的层次深度'
      },
      {
        flag: '-j, --json [file-path]',
        description: '将依赖关系以 JSON 形式存储到指定的文件'
      }
    ]
  },
  '*': {
    alias: '',
    description: 'command not found',
    examples: []
  }
}

export function getQueryParam(query: any, key: string): string | undefined {
  const value = query[key]
  if (isArray(value)) {
    return value[0]
  } else if (typeof value === 'string') {
    return value ? value : undefined
  }
  return undefined
}

export async function saveJsonToFile(json, filePath) {
  const folderPath = path.resolve(projectRoot, filePath)
  const graphFilePath = path.join(folderPath, 'graph.json')

  try {
    // 检查路径是否存在, 不存在创建
    await fs.mkdir(folderPath, { recursive: true })

    // 写入
    await fs.writeFile(graphFilePath, json, 'utf-8')
    console.log(`JSON已成功保存到文件: ${graphFilePath}`)
  } catch (error) {
    console.error(`保存JSON到文件错误: ${error}`)
  }
}
