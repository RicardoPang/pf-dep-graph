import { defineStore } from 'pinia'
import { getGraphData } from '@/service/graph/graph'
import type { IGraphProps, INodeArrayProps } from '@/types/graph'

const useGraphStore = defineStore('graph', {
  state: () => {
    return {
      graph: [] as IGraphProps[],
      nodeArray: [] as INodeArrayProps[]
    }
  },
  actions: {
    async getGraphDataAction(searchQuery?: string) {
      const resp = await getGraphData(searchQuery)
      if (resp.code === 0) {
        this.graph = resp.data.graph
        this.nodeArray = resp.data.nodeArray
      } else {
        ElMessage.error(resp.message || '获取数据失败')
        return [[] as IGraphProps[], [] as INodeArrayProps[]]
      }
    }
  }
})
export default useGraphStore
