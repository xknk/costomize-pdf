<template>
    <div class="top-option-box">
        <div class="one-option-box">
            <i class="iconfont icon-suolvetu one-icon-box"></i>
        </div>
        <div class="one-option-box">
            <i class="iconfont icon-icon-arrow-top2 two-icon-box"></i>
            <i class="iconfont icon-icon-arrow-bottom2 two-icon-box"></i>
            <div class="page-box">
                <el-input
                    v-model="pageObj.pageSize"
                    placeholder="页数"
                    class="el-input"
                    size="small"
                >
                </el-input>
                <span class="page-total-box">/ {{ pageObj.total }}页 </span>
            </div>
        </div>
        <div class="one-option-box">
            <span class="font-title-box">字体大小</span>
            <el-select
                v-model="configObj.fontSize"
                placeholder="Select"
                style="width: 240px"
                size="small"
            >
                <el-option
                    v-for="item in fontOptions"
                    :key="item.value"
                    :label="item.value"
                    :value="item.value"
                />
            </el-select>
        </div>
        <div class="one-option-box">
            <span class="font-title-box">颜色</span>
            <el-color-picker v-model="configObj.fontColor" />
        </div>
        <div class="tow-option-box">
            <div
                class="icons-box"
                v-for="item in iconOptions"
                @click="selectIcon = item.icon"
                :key="item.icon"
            >
                <i
                    class="iconfont"
                    :class="`${item.icon} ${item.class} ${
                        selectIcon == item.icon ? 'select-icon-box' : ''
                    }`"
                    @click="selectIcon = item.icon"
                ></i>
            </div>
        </div>
        <div class="one-option-box">
            <div v-for="item in revokeOptions" :key="item.icon">
                <i :class="`iconfont ${item.icon}`"></i>
            </div>
        </div>
        <div class="one-option-box">
            <div v-for="item in downOptions" :key="item.icon">
                <i :class="`iconfont ${item.icon}`"></i>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
export default {
    name: "TopOption",
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
import { fontOptions, iconOptions, revokeOptions, downOptions } from "./config";
const pageObj = ref<{
    pageSize: number;
    total: number;
}>({
    pageSize: 1,
    total: 10,
});
const configObj = ref<{
    fontSize: number;
    fontColor: string;
}>({
    fontSize: 12,
    fontColor: "#000000",
});
const selectIcon = ref<string>("icon-shou");
</script>
<style scoped>
.top-option-box {
    height: 3rem;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    color: #666;
    border-bottom: 1px solid #c2c2c2;
    box-sizing: border-box;
    overflow: auto;
    background-color: #f5f5f5;

}
.one-option-box {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 1rem;
    border-right: 1px solid #c2c2c2;
    box-sizing: border-box;
}
.tow-option-box {
    display: flex;
    align-items: center;
    height: 100%;
    border-right: 1px solid #c2c2c2;
    box-sizing: border-box;
}
.icons-box:first-child {
    padding-left: 0.7rem;
}
.icons-box {
    padding: 0 0.6rem 0 0;
}
.icons-box i {
    padding: 0.2rem;
}
.icon-box {
    margin-right: 1rem;
}
.one-icon-box {
    font-size: 1.6rem;
    color: #333;
}
.two-icon-box {
    font-size: 1.2rem;
    color: #666;
    margin-right: 1rem;
}
.tree-icon-box {
    font-size: 1.2rem;
    color: #666;
}
.one-icon-box:hover,
.two-icon-box:hover,
.tree-icon-box:hover {
    color: #000;
    cursor: pointer;
}
.page-box {
    display: flex;
    align-items: center;
    height: 100%;
}
.page-total-box {
    margin-left: 0.5rem;
}
.font-title-box {
    margin-right: 1rem;
}
.select-icon-box {
    background: #fff;
}
</style>
<style>
.top-option-box .one-option-box .el-input--small {
    width: 2.8rem;
}
.el-input__inner {
    text-align: center;
    font-size: 0.8rem;
}
.el-select--small {
    width: 3.5rem !important;
    font-size: 0.8rem;
}
.el-select--small .el-select__wrapper {
    font-size: 0.8rem !important;
}
</style>
