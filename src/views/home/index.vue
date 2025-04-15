<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 13:52:46
 * @LastEditTime: 2025-04-14 14:28:03
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\index.vue
-->
<template>
    <div class="home-box">
        <TopOption
            :currenPage="currenPage"
            :total="total"
            @changeSizeFunc="setPageNumFunc"
            @hideLeftFunc="hidePreviewPdfFunc"
            @optionPreviewFunc="optionPreviewFunc"
            @selectOptionFunc="selectOptionFunc"
        />
        <div class="home-main-box">
            <div
                :class="`preview-box ${isReviewPdf ? '' : 'collapsed'}`"
                ref="previewDom"
            >
                <PreviewPdf
                    :thumbnailArr.sync="thumbnailArr"
                    :currenPage="currenPage"
                    @setPageNumFunc="setPageNumFunc"
                />
            </div>
            <div class="mian-box">
                <PdfView
                    ref="pdfDom"
                    :istThumbnail="true"
                    @getThumbnail="getThumbnailFunc"
                    @getPageNum="getPageNumFunc"
                    @mountPdf="initPdfFunc"
                    :drawConfig="optionObj"
                />
            </div>
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
import PdfView from "@/components/pdfView.vue";
const thumbnailArr = ref<string[]>([]);
const currenPage = ref<string | number>(1); // 获取得当前页码
const total = ref<number>(1);
const pdfDom = ref<any>(null);
const previewDom = ref<any>(null);
const isReviewPdf = ref<boolean>(true);
type optionTs = {
    type: string;
    fontConfigObj: {
        fontSize: number;
        fontColor: string;
    };
};
const optionObj = ref<optionTs>({});
const getThumbnailFunc = ({
    thumbnail,
    thumbnailInfoArr,
}: {
    thumbnail: string[];
    thumbnailInfoArr: { imgUrl: string; pageIndex: number }[];
}) => {
    thumbnailArr.value = thumbnail;
};
const setPageNumFunc = (event: number) => {
    currenPage.value = event;
    pdfDom.value.setPage(currenPage.value);
};
const getPageNumFunc = (event: string | number) => {
    currenPage.value = event;
};
const initPdfFunc = ({
    pageRefs,
    canvasRefs,
    pagesCount,
    scale,
}: {
    pageRefs: HTMLElement;
    canvasRefs: HTMLElement;
    pagesCount: number;
    scale: number;
}) => {
    total.value = pagesCount;
    pdfDom.value.setPage(currenPage.value);
};
const hidePreviewPdfFunc = () => {
    isReviewPdf.value = !isReviewPdf.value;
};
const optionPreviewFunc = (type: string) => {
    if (!previewDom.value) return;
    const visibleHeight = previewDom.value.clientHeight;
    const startScrollTop = previewDom.value.scrollTop;
    const scrollHeight = previewDom.value.scrollHeight;
    let endScrollTop;
    if (type === "down") {
        endScrollTop = startScrollTop + visibleHeight;
        // 判断是否触底
        if (endScrollTop > scrollHeight - visibleHeight) {
            return;
        }
    } else {
        endScrollTop = startScrollTop - visibleHeight;
        // 判断是否触顶
        if (endScrollTop < 0) {
            return;
        }
    }
    const duration = 300; // 动画持续时间（毫秒）
    const startTime = performance.now();
    const animateScroll = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime < duration) {
            const progress = elapsedTime / duration;
            previewDom.value.scrollTop =
                startScrollTop + (endScrollTop - startScrollTop) * progress;
            window.requestAnimationFrame(animateScroll);
        } else {
            previewDom.value.scrollTop = endScrollTop;
        }
    };
    window.requestAnimationFrame(animateScroll);
};
const selectOptionFunc = (event: optionTs) => {
    optionObj.value = event;
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
.preview-box {
    width: 18rem;
    height: 100%;
    background-color: #f5f5f5;
    border-right: 1px solid #c2c2c2;
    box-sizing: border-box;
    transition: transform 0.3s ease;
    transform-origin: left;
    overflow-y: auto;
}
.preview-box.collapsed {
    transform: scaleX(0);
}
.mian-box {
    height: 100%;
    flex: 1;
    overflow-y: auto;
}
</style>
