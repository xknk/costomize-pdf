<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 17:06:55
 * @LastEditTime: 2025-04-11 15:55:04
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\components\previewPdf.vue
-->
<template>
    <div class="preview-pdf-box">
        <div
            :class="`imgs-box ${currenPage == index + 1 ? 'select-image-box' : ''}`"
            v-for="(item, index) in thumbnailArr"
            :key="index"
            @click="setPageNumFunc(index + 1)"
        >
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
const emits = defineEmits(["setPageNumFunc"]);
const props = defineProps({
    thumbnailArr: {
        default: () => [],
        type: Array,
    },
    currenPage: {
        type: [String, Number],
        default: 1,
    },
});

const setPageNumFunc = (pageNum: number) => {
    emits("setPageNumFunc", pageNum);
};
</script>
<style scoped>
.preview-pdf-box {
    width: auto;
    height: 100%;
}
.imgs-box {
    margin: 1.5rem;
    box-shadow: #333 0px 1px 10px 0px;
    padding: 1px;
}
.imgs-box:hover {
    cursor: pointer;
    border: #333 1px solid;
    box-sizing: border-box;
    padding: 0px;
}
.select-image-box {
    border: #333 1px solid;
    box-sizing: border-box;
    padding: 0px;
}
</style>
