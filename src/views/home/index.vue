<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 13:52:46
 * @LastEditTime: 2025-04-27 09:37:25
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
            @saveFunc="saveFunc"
            @revokeFunc="revokeFunc"
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
                    @getQueueStack="getQueueStackFunc"
                    :drawConfig="optionObj"
                    :url="examplePdf"
                    :jsonData="storeAnnotationsJson"
                />
            </div>
            <optionHistory
                :queueStackArr="queueStackArr"
                @selectAnnotationsFunc="selectAnnotationsFunc"
                @delectAnnotationsFunc="delectAnnotationsFunc"
            />
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
import optionHistory from "./components/optionHistory.vue";
import PdfView from "@/components/pdfView.vue";
const thumbnailArr = ref<string[]>([]);
const currenPage = ref<string | number>(1); // 获取得当前页码
const total = ref<number>(1);
const pdfDom = ref<any>(null);
const previewDom = ref<any>(null);
const isReviewPdf = ref<boolean>(true);
const examplePdf = ref<string>("file/vuejs.pdf");
const queueStackArr = ref<any>([]);
const storeAnnotationsJson = ref<any>(
    localStorage.getItem("storeAnnotations")
        ? JSON.parse(localStorage.getItem("storeAnnotations") || "")
        : ""
);
type optionTs = {
    type?: string;
    fontSize?: number;
    fontColor?: string;
    lineColor?: string;
    lineWidth?: number;
    imgUrl?: string;
};
const optionObj = ref<optionTs>({
    type: "",
    fontSize: 14,
    fontColor: "#000000",
    lineColor: "red",
    lineWidth: 1,
});
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
    if (event.type === "text") {
        pdfDom.value.addText();
    } else if (event.type === "image" && event.imgUrl) {
        pdfDom.value.addImage(event.imgUrl);
    } else if (event.type === "reset") {
        pdfDom.value.resetActiveObject();
    }
};
const saveFunc = async ({ type }: { type: string }) => {
    if (type === "save") {
        const jsonObj = await pdfDom.value.getJson(type);
        let newJsonObj: any = {};
        for (let key in jsonObj) {
            newJsonObj[key] = jsonObj[key];
        }
        localStorage.setItem("storeAnnotations", JSON.stringify(newJsonObj));
    } else {
        const downUrl = await pdfDom.value.getDownUrl(type);
        // console.log(downUrl, "downUrl");
        const link = document.createElement("a");
        link.href = downUrl;
        link.download = `annotated-pdf.pdf`;
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
const revokeFunc = ({ type }: { type: string }) => {
    if (type === "revoke") {
        pdfDom.value.undo();
    } else if (type === "reverse_revoke") {
        pdfDom.value.redo();
    } else if (type === "clear") {
        pdfDom.value.clearActiveObjectAll();
    }
};

const getQueueStackFunc = (event: any) => {
    queueStackArr.value = event;
};

const selectAnnotationsFunc = ({ id, pageNum }: { id: string; pageNum: string }) => {
    pdfDom.value.setPage(pageNum);
    pdfDom.value.setActiveObject(id, pageNum);
};

const delectAnnotationsFunc = ({ id, pageNum }: { id: string; pageNum: string }) => {
    pdfDom.value.removeActiveObject(id, pageNum);
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
