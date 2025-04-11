<!--
 * @Author: Robin LEI
 * @Date: 2025-04-09 17:13:23
 * @LastEditTime: 2025-04-11 15:09:45
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\views\home\components\optionHostory.vue
-->
<template>
    <div class="option-hostory-box"></div>
</template>
<script lang="ts">
export default {
    name: "OptionHostory",
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
</script>
<style scoped>
.option-hostory-box {
    width: 18rem;
    height: 100%;
    overflow: auto;
    background-color: #f5f5f5;
    border-left: 1px solid #c2c2c2;
}
</style>
