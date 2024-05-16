<template>
  <div class="graph-wrapper">
    <!-- 容器 -->
    <div ref="chart"></div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3'
import type { IGraphProps, INodeArrayProps } from '@/types/graph'
import { onMounted, ref, watchEffect, type PropType } from 'vue'

// 定义接收的属性
const props = defineProps({
  graph: {
    type: Array as PropType<IGraphProps[]>,
    default: () => []
  },
  nodeArray: {
    type: Array as PropType<INodeArrayProps[]>,
    default: () => []
  }
})

// 存储SVG元素
const chart = ref<SVGSVGElement | null>(null)
// 存储d3力导向图模拟
let simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>

// 渲染图表
const renderChart = (convertedData: { nodes: any[]; links: any[] }) => {
  if (!chart.value) {
    return
  }

  // 清空图表容器
  chart.value.innerHTML = ''

  // 模拟会改变链接和节点 创建一个副本
  const links = convertedData.links.map((d) => ({ ...d })) // 创建链接副本
  const nodes = convertedData.nodes.map((d) => ({ ...d })) // 创建节点副本

  // 定义图表的尺寸
  const width = 928
  const height = 600

  // 定义颜色比例尺
  const color = d3.scaleOrdinal(d3.schemeCategory10)

  // 定义缩放
  const zoom = d3
    .zoom()
    .scaleExtent([1, 10]) // 设置缩放范围，1 表示原始大小，10 表示最大放大为原始大小的10倍
    .on('zoom', (d3: any) => zoomed(d3))

  // 创建svg容器
  const svg = d3
    .create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('style', 'max-width: 100%; height: auto;')
    .call(zoom as d3.ZoomBehavior<any, any>)

  // 创建连接线
  const link = svg
    .append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke-width', 1.5)
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('fill', 'none')
    .on('mouseover', handleLinkMouseOver) // 添加鼠标移入事件
    .on('mouseout', handleLinkMouseOut) // 添加鼠标移出事件

  // 创建节点
  const node = svg
    .append('g')
    .attr('fill', 'currentColor')
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', 6)
    .attr('fill', (d) => color(String(d.group)))
    .style('cursor', 'pointer')
    .style('position', 'relative')
    .call(drag() as any) // 添加拖动事件
    .on('mouseover', handleMouseOver) // 添加鼠标移入事件
    .on('mouseout', handleMouseOut) // 添加鼠标移出事件

  // 将SVG添加到容器
  chart.value.appendChild(svg.node()!)

  // 链接鼠标移入事件
  function handleLinkMouseOver(event: MouseEvent, d: any) {
    // 移除旧的tooltip
    d3.select('.custom-link-tooltip').remove()

    // 获取鼠标相对于文档的位置
    const mouseX = event.pageX
    const mouseY = event.pageY

    // 计算 tooltip 的位置相对于鼠标位置
    const tooltipOffsetX = 10 // 水平偏移量
    const tooltipOffsetY = 10 // 垂直偏移量

    // 显示tooltip
    d3.select('body')
      .append('div')
      .attr('class', 'custom-link-tooltip')
      .html(`来源：${d.source.id}<br/>去向：${d.target.id}`)
      .style('position', 'absolute')
      .style('left', `${mouseX + tooltipOffsetX}px`)
      .style('top', `${mouseY + tooltipOffsetY}px`)
      .style('opacity', 0.9)
      .style('visibility', 'visible')
      .style('z-index', 9999)
      .style('background-color', 'white')
      .style('color', '#333')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('font-size', '14px')
      .style('box-shadow', '2px 2px 6px rgba(0, 0, 0, 0.1)')
  }

  // 链接鼠标移出事件
  function handleLinkMouseOut() {
    d3.select('.custom-link-tooltip').remove()
  }

  // 鼠标移入节点 自定义高亮
  function handleMouseOver(event: MouseEvent, d: any) {
    // 当前节点
    var hoveredNode = d
    console.log(hoveredNode)

    // 移除旧的tooltip
    d3.select('.custom-tooltip').remove()

    // 设置节点的透明度
    node.style('opacity', (d: any) => {
      if (d.id === hoveredNode.id) return 1
      const opacityValue = links.some((item) => {
        return item.source.id === hoveredNode.id && item.target.id === d.id
      })
        ? 1
        : 0.1
      return opacityValue
    })
    // 设置连接线的透明度
    link.style('opacity', (link: any) => (link.source === d ? 1 : 0.1))

    // 获取鼠标相对于文档的位置
    const mouseX = event.pageX
    const mouseY = event.pageY

    // 计算 tooltip 的位置相对于鼠标位置
    const tooltipOffsetX = 10 // 水平偏移量
    const tooltipOffsetY = 10 // 垂直偏移量

    // 显示tooltip
    d3.select('body')
      .append('div')
      .attr('class', 'custom-tooltip')
      .html(`${hoveredNode.id}`)
      .style('position', 'absolute')
      .style('left', `${mouseX + tooltipOffsetX}px`)
      .style('top', `${mouseY + tooltipOffsetY}px`)
      .style('opacity', 0.9)
      .style('visibility', 'visible')
      .style('z-index', 9999)
      .style('background-color', 'white')
      .style('color', '#333')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('font-size', '14px')
      .style('box-shadow', '2px 2px 6px rgba(0, 0, 0, 0.1)')
  }

  // 移出节点时的处理函数
  function handleMouseOut() {
    // 设置节点的透明度
    node.style('opacity', 1)
    // 设置连接线的透明度
    link.style('opacity', 1)

    // 隐藏tooltip
    d3.select('.custom-tooltip').remove()
  }

  // 添加拖动
  function drag() {
    // 拖动开始
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }
    // 拖动中
    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }
    // 拖动结束
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return d3
      .drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
  }

  function zoomed(event: any) {
    // 获取缩放和平移的变换
    const transform = event.transform
    link.attr('transform', transform)
    node.attr('transform', transform)
  }

  // 设置链接和节点的位置
  function ticked() {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
  }

  if (simulation) {
    simulation.stop()
  }

  // 创建模型
  simulation = d3
    .forceSimulation(nodes as any)
    .force(
      'link',
      d3.forceLink(links).id((d: any) => d.id)
    )
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(width / 2, height / 2))
    .on('tick', ticked)
}

// 数据转换
const convertData = (graph: IGraphProps[], nodeArray: INodeArrayProps[]) => {
  const links = graph.map((link) => ({
    source: link.source,
    target: link.target,
    value: link.value ?? 1
  }))

  const nodes = nodeArray.map((node) => ({
    id: node.id,
    group: node.group ?? 1
  }))

  return { nodes, links }
}

let convertedData: {
  nodes: {
    id: string
    group: number
  }[]
  links: {
    source: string
    target: string
    value: number
  }[]
}

watchEffect(() => {
  // 确保 graph 和 nodeArray 有值后再进行渲染
  // 监测数据变化
  convertedData = convertData(props.graph, props.nodeArray)
  renderChart(convertedData)
})

onMounted(() => {
  // 确保组件挂载后再进行渲染
  renderChart(convertedData)
})
</script>

<style lang="less" scoped></style>
