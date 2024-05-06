import path from 'path'
import fs from 'fs/promises'

// 配置信息路径
export const readPkgPath = async (): Promise<string> => {
  const filePath = path.join(__dirname, '..', 'package.json')
  return filePath
}

// 配置信息
export const readPackageJson = async (): Promise<any> => {
  try {
    const filePath = await readPkgPath()
    const pkg = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(pkg)
  } catch (error) {
    console.error('Error reading package.json:', error)
    return null
  }
}

// 读取版本号
export const readVersion = async (): Promise<string> => {
  const packageJson = await readPackageJson()
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
    examples: ['dep-graph-cli analyze <lockFilename>'],
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
