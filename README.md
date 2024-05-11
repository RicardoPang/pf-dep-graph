## Node Library 依赖关系分析

> 支持拖拽、缩放、hover节点高亮、显示连线关系、搜索等功能

### 一. 项目准备

- 拉取项目

  ```bash
  git clone https://github.com/Devil-Training-Camp/pf-dep-graph.git
  ```

- 进入当前目录 /pf-dep-graph 执行 __npm install__

- 进入服务器目录 /pf-dep-graph/dep-graph-cli 执行 __npm install__

  

### 二. 项目运行（测试/开发）

> 附加：如果没有 dep-graph-cli 命令 可尝试执行 __npm link__ 链接到本地

- 进入当前目录 /pf-dep-graph 执行 npm run dev  浏览器打开链接 http://localhost:5173/

- 进入服务器目录 /pf-dep-graph/dep-graph-cli 执行__ dep-graph-cli ana__

  - 新增了选择：是否希望通过解析lock文件来生成依赖关系图？否则会递归读取node_modules（默认解析锁文件, depth参数无效）
  - 可选参数：depth递归深度不支持解析lock文件；

  ```bash
  Options:
    -d, --depth <n>         限制向下递归分析的层次深度
    -j, --json [file-path]  将依赖关系以 JSON 形式存储到指定的文件
    -h, --help              display help for command
  ```

- 后面可以根据自己的需要进行测试或开发，debugger在需要的地方添加，还是使用这里执行 __dep-graph-cli ana__ 启动

  ![image-20240511115554496](https://p.ipic.vip/wx54nq.png)

  

### 三. 使用npm安装cli包

- 本地运行项目:

  1. 前端项目打包 进入当前目录 /pf-dep-graph 执行 __npm run build__ 生成dist文件

  2. 进入dist目录执行 __http-server -p 8080__ 开启服务(模拟)

  3. 在任意项目中打开终端执行 __npm i dep-graph-cli__
  3. 执行命令 __dep-graph-cli ana__ 就会在谷歌浏览器打开一个前端页面，展示依赖关系


### 四. 附: 支持 --json=[file-path] 参数，传入后不再打开网页，只是将依赖关系以 JSON 形式存储到用户指定的文件

```bash
dep-graph-cli ana -d 3 -j ./target
```

### 五. buildGraph 关键流程

![依赖分析](https://p.ipic.vip/6v6let.jpg)

### 六. 新增解析 lock file

> /dep-graph-cli/src/server.ts

````
// 开启服务器
export const startServer = async (depth: number, json: string) => {
  // 解析 lock file，需要兼容 npm/yarn/pnpm
  const { name, content, lockPath } = await getProjectLockFile()
  switch (name) {
    case 'pnpm-lock.yaml': {
      const pnpm = new PnpmLockGraph({ name, content, lockPath, depth })
      const pnpmData = await pnpm.parse()
      if (json) {
        await saveJsonToFile(JSON.stringify(pnpmData), json)
      } else {
        startLockApiServer(pnpmData)
      }
      break
    }
    case 'yarn.lock': {
      const yarn = new YarnLockGraph({ name, content, lockPath, depth })
      const yarnData = await yarn.parse()
      if (json) {
        await saveJsonToFile(JSON.stringify(yarnData), json)
      } else {
        startLockApiServer(yarnData)
      }
      break
    }
    case 'package-lock.json': {
      const npm = new NpmLockGraph({ name, content, lockPath, depth })
      const npmData = await npm.parse()
      if (json) {
        await saveJsonToFile(JSON.stringify(npmData), json)
      } else {
        startLockApiServer(npmData)
      }
      break
    }
    default:
      break
  }

  // 读 node_modules 里面的 packages 的目录/文件，找出依赖关系
  // if (json) {
  //   generateAndSaveGraph(depth, json)
  // } else {
  //   startApiServer(depth)
  // }
}
````
