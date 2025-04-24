<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 17:13:23
 * @LastEditTime: 2025-04-24 10:59:41
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\components\optionHistory.vue
-->
<template>
    <div class="option-history-box">
        <el-collapse v-model="selectActive" @change="clickOutsideFunc">
            <el-collapse-item
                :name="key"
                v-for="[key, value] in queueStackArr"
                :key="key"
            >
                <template #title>
                    <span class="history-title-box">第{{ key }}页批注</span>
                </template>
                <div
                    class="history-content-box"
                    v-for="childItem in value"
                    :key="childItem.id"
                    @click="selectAnnotationsFunc(childItem.id, key)"
                >
                    <span v-if="childItem.type !== 'i-text'">{{ childItem.type }}</span>
                    <span v-else>{{ childItem.text }}</span>
                    <i
                        class="iconfont icon-shanchu3"
                        @click.stop="delectAnnotationsFunc(childItem.id, key)"
                    />
                </div>
            </el-collapse-item>
        </el-collapse>
    </div>
</template>
<script lang="ts">
export default {
    name: "Optionhistory",
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
const emits = defineEmits(["selectAnnotationsFunc", "delectAnnotationsFunc"]);
const props = defineProps({
    queueStackArr: {
        type: Array,
        default: () => [],
    },
});
const { queueStackArr }: { queueStackArr: any } = toRefs(props);
const selectActive = ref<string>("");
const clickOutsideFunc = (val: string) => {
    selectActive.value = val;
};
const selectAnnotationsFunc = (id: string, pageNum: string) => {
    emits("selectAnnotationsFunc", {
        id,
        pageNum,
    });
};
const delectAnnotationsFunc = (id: string, pageNum: string) => {
    emits("delectAnnotationsFunc", {
        id,
        pageNum,
    });
};
</script>

<style scoped>
.option-history-box {
    width: 18rem;
    height: 100%;
    overflow: auto;
    background-color: #f5f5f5;
    border-left: 1px solid #c2c2c2;
}
.history-title-box {
    font-size: 0.8rem;
    font-weight: 600;
    color: #666;
    padding: 0.5rem;
}
.history-content-box {
    color: #1976d3;
    padding: 0.5rem;
    border-bottom: 1px dashed #eee;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
}
.history-content-box:last-child {
    border-bottom: none;
}
.icon-shanchu3 {
    color: #f56c6c;
}
</style>
<style>
.option-history-box .el-collapse-item__content {
    padding-bottom: 0;
}
</style>
