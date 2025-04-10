<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 17:06:55
 * @LastEditTime: 2025-04-10 11:30:51
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\components\previewPdf.vue
-->
<template>
    <div class="preview-pdf-box">
        <div class="imgs-box" v-for="(item, index) in thumbnailArr" :key="index">
            <el-image :src="item"></el-image>
        </div>
    </div>
</template>
<script lang="ts">
export default {
    name: "previewPdf",
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
const props = defineProps({
    thumbnailArr: {
        default: () => [],
        type: Array,
    },
});
</script>
<style scoped>
.preview-pdf-box {
    width: 23rem;
    height: 100%;
    overflow: auto;
    background-color: #f5f5f5;
    border-right: 1px solid #c2c2c2;
}
.imgs-box {
    margin: 1.5rem;
    box-shadow: #333 0px 1px 10px 0px;
}
.imgs-box:hover{
    cursor: pointer;
}
</style>
