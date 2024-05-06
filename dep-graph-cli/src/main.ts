import { Command } from 'commander'
import { mapActions, readVersion } from './constants'
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
        console.log('command not found')
      } else {
        const { depth, json } = cmdObj
        startServer(depth, json)
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
  program.version(version).parse(process.argv)
}
