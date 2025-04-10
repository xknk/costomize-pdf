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
    width: 20rem;
    height: 100%;
    overflow: auto;
    background-color: #f5f5f5;
    border-left: 1px solid #c2c2c2;
}
</style>
