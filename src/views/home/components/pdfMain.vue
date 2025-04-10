<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 17:17:26
 * @LastEditTime: 2025-04-10 11:17:25
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\components\pdfMain.vue
-->
<template>
    <div class="mian-box">
        <PdfView :istThumbnail="true" @getThumbnail="getThumbnailFunc" />
    </div>
</template>
<script lang="ts">
export default {
    name: "PdfMain",
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
import PdfView from "@/components/pdfView.vue";
const emits = defineEmits(["getThumbnailFunc"]);
/**
 * @description: 获取pdf缩略图
 * @return {*}
 */
const getThumbnailFunc = ({
    thumbnail,
    thumbnailInfoArr,
}: {
    thumbnail: string[];
    thumbnailInfoArr: { imgUrl: string; pageIndex: number }[];
}) => {
    console.log(thumbnail, 'thumbnail')
    emits("getThumbnailFunc", thumbnail);
};
</script>
<style scoped>
.mian-box {
    width: 100%;
    height: 100%;
    overflow: auto;
}
</style>
