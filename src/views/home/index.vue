<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 13:52:46
 * @LastEditTime: 2025-04-09 13:52:55
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\index.vue
-->
<template>
    <div class="home-box"></div>
</template>
<script lang="ts">
export default {
    name: "Home",
};
</script>
<script setup lang="ts">
import {
    defineComponent,
    reactive,
    ref,
    toRef,
    toRefs,
    defineProps,
    defineEmits,
} from "vue";
</script>
<style scoped>
.home-box{
    height:100%;
    width:100%;
    background-color: #f5f5f5;
}
</style>
