## Node Library 依赖关系分析

### 项目启动

- 拉取项目

  ```bash
  git clone https://github.com/Devil-Training-Camp/pf-dep-graph.git
  ```

- 执行 npm install

  1. 当前目录(前端)执行

  ```bash
  npm install
  ```

  2. 进入 dep-graph-cli 目录执行

  ```bash
  npm install
  ```

- 运行项目:

  1. 当前前端目录执行打包

  ```bash
  npm run build
  ```

  命令打包前端项目，生成dist文件

  2. 进入dist目录执行

  ```
  http-server -p 8080
  ```

  命令开启服务(模拟)

  3. 新开终端进入 dep-graph-cli 目录执行

  ```bash
  dep-graph-cli ana -d 2
  ```
  如果本地执行dep-graph-cli报错，可以尝试执行
  
  ```bash
  sudo npm link
  ```
  或直接安装线上的npm包 npm i dep-graph-cli

  命令执行后 会在Chrome浏览器启动项目，直接操作即可，支持拖拽、缩放、hover高亮、搜索

### 附：前后端分别运行

- 拉取项目

  ```bash
  git clone https://github.com/Devil-Training-Camp/pf-dep-graph.git
  ```

- 当前(前端)目录执行

  ```bash
  npm install
  ```

- 前端运行

  ```
  npm run dev
  ```

- 进入 _dep-graph-cli_ 执行

  ```bash
  npm install
  ```

- 后端运行

  ```
  dep-graph-cli ana -d 2
  ```

### 附： 在其他项目使用cli

- 拉取项目

  ```bash
  git clone https://github.com/Devil-Training-Camp/pf-dep-graph.git
  ```

- 执行npm install

  ```
  npm install
  ```

- 打包

  ```
  npm run build
  ```

- 进入 dist 目录启动服务

  ```
  http-server -p 8080
  ```

- 在自己的项目中安装

  ```
  npm i dep-graph-cli
  ```

- 执行cli

  ```
  dep-graph-cli ana -d 2
  ```

### 附: 支持 --json=[file-path] 参数，传入后不再打开网页，只是将依赖关系以 JSON 形式存储到用户指定的文件

```
dep-graph-cli ana -d 3 -j ./target
```
