<template>
  <div id="app">
    <DOMBasedPDFViewer :url="pdfUrl" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DOMBasedPDFViewer from '@/components/DOMBasedPDFViewer.vue';

// 使用 public/file 目录下的 vuejs.pdf 文件
const pdfUrl = ref('/file/vuejs.pdf');
</script>

<style>
html,
body {
  height: 100vh;
  margin: 0;
  padding: 0;
  width: 100vw;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  width: 100%;
}
</style>
