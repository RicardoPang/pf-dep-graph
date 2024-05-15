import { Command } from 'commander'
import inquirer from 'inquirer'
import { mapActions, readVersion } from './utils'
import { startServer } from './server'

export const main = async () => {
  const program = new Command()
  const version = await readVersion()

  // 循环创建命令
  Reflect.ownKeys(mapActions).forEach((action) => {
    const cmd = program
      .command(String(action)) // 配置命令名称
      .alias(mapActions[action].alias) // 命令别名
      .description(mapActions[action].description) // 命令对应描述

    // 选项
    if (mapActions[action].options) {
      mapActions[action].options.forEach((option) => {
        cmd.option(option.flag, option.description)
      })
    }

    cmd.action((cmdObj) => {
      if (action === '*') {
        console.log('没有找到对应的命令')
      } else {
        inquirer
          .prompt({
            type: 'confirm',
            name: 'isParseLockFile',
            message:
              '是否希望通过解析lock文件来生成依赖关系图？否则会递归读取node_modules（默认解析锁文件, depth参数无效）',
            default: true
          })
          .then((answers) => {
            const { depth, json } = cmdObj
            const { isParseLockFile } = answers
            startServer(depth, json, isParseLockFile)
          })
      }
    })
  })

  // 监听用户的help事件
  program.on('--help', () => {
    console.log('\nExamples:')
    Reflect.ownKeys(mapActions).forEach((action) => {
      mapActions[action].examples.forEach((example) => {
        console.log(`  ${example}`)
      })
    })
  })

  // 动态获取版本号放到配置指令命令下
  // parse解析命令行参数
  // process.argv[0]是Node.js进程的可执行文件路径
  // process.argv[1]是当前执行的JavaScript文件的路径
  program.version(version).parse(process.argv)
}
