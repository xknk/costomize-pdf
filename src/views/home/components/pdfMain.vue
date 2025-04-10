<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 17:17:26
 * @LastEditTime: 2025-04-10 17:37:32
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\components\pdfMain.vue
-->
<template>
    <div class="mian-box">
        <PdfView
            :istThumbnail="true"
            @getThumbnail="getThumbnailFunc"
            :currenIndex="currenIndex"
            @getPageNum="getPageNumFunc"
        />
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
    watchEffect,
} from "vue";
import PdfView from "@/components/pdfView.vue";
const emits = defineEmits(["getThumbnailFunc", "update:currenPage"]);
const props = defineProps({
    currenIndex: {
        type: [String, Number],
        default: 0,
    },
});
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
    emits("getThumbnailFunc", thumbnail);
};
const getPageNumFunc = (evnet: string | number) => {
    emits("update:currenPage", evnet);
};
</script>
<style scoped>
.mian-box {
    width: 100%;
    height: 100%;
    overflow: auto;
}
</style>
