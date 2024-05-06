<template>
  <div class="home">
    <h2>依赖关系</h2>
    <el-input
      v-model="q"
      placeholder="请输入"
      :suffix-icon="Search"
      @change="handleSearch"
    />
    <Graph :graph="graph" :node-array="nodeArray" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import useGraphStore from '@/store/graph/graph'
import { Search } from '@element-plus/icons-vue'
import Graph from '@/components/graph/graph.vue'
import { storeToRefs } from 'pinia'

const q = ref('')
const graphStore = useGraphStore()
graphStore.getGraphDataAction(q.value)
const { graph, nodeArray } = storeToRefs(graphStore)
console.log(graph, nodeArray)

const handleSearch = () => {
  graphStore.getGraphDataAction(q.value)
  const { graph, nodeArray } = storeToRefs(graphStore)
  console.log(graph, nodeArray)
}
</script>

<style lang="less" scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: #333;

  h2 {
    margin-bottom: 20px;
    color: #5c6ac4;
  }

  .el-input {
    max-width: 600px;
    width: 100%;
    margin-bottom: 30px;

    .el-input__inner {
      border-radius: 20px;
      border: 1px solid #d3dce6;
      padding: 10px 15px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      &:focus {
        border-color: #5c6ac4;
      }
    }

    .el-input__icon {
      color: #5c6ac4;
    }
  }
}
</style>
