<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 13:52:46
 * @LastEditTime: 2025-04-10 11:14:40
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\index.vue
-->
<template>
    <div class="home-box">
        <TopOption />
        <div class="home-main-box">
            <PreviewPdf :thumbnailArr="thumbnailArr" />
            <PdfMain @getThumbnailFunc="getThumbnailFunc" />
            <OptionHostory />
        </div>
    </div>
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
import TopOption from "./components/topOption.vue";
import PreviewPdf from "./components/previewPdf.vue";
import OptionHostory from "./components/optionHostory.vue";
import PdfMain from "./components/pdfMain.vue";
const thumbnailArr = ref<string[]>([]);
const getThumbnailFunc = (thumbnail: string[]) => {
    thumbnailArr.value = thumbnail;
};
</script>
<style scoped>
.home-box {
    height: 100%;
    width: 100%;
    font-size: 0.8rem;
}
.home-main-box {
    width: 100%;
    height: calc(100% - 3rem);
    display: flex;
    align-items: center;
}
.pdf-main-box {
    flex: 1;
}
</style>
