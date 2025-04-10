<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 13:52:46
 * @LastEditTime: 2025-04-10 17:38:55
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\index.vue
-->
<template>
    <div class="home-box">
        <TopOption />
        <div class="home-main-box">
            <PreviewPdf :thumbnailArr.sync="thumbnailArr" :currenPage="currenPage" />
            <PdfMain
                @getThumbnailFunc="getThumbnailFunc"
                v-model:currenPage="currenPage"
            />
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
    watch,
} from "vue";
import TopOption from "./components/topOption.vue";
import PreviewPdf from "./components/previewPdf.vue";
import OptionHostory from "./components/optionHostory.vue";
import PdfMain from "./components/pdfMain.vue";
const thumbnailArr = ref<string[]>([]);
const currenPage = ref<string | number>(0); // 当前页码
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
