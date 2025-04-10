<template>
    <Home />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Home from "@/views/home/index.vue";
@Options({
    components: {
        Home,
    },
})
export default class App extends Vue {}
</script>

<style>
html,
body {
    height: 100vh;
    margin: 0;
    padding: 0;
    width: 100vw;
}
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    height: 100%;
    widows: 100%;
}
/* 默认字体大小，适用于所有屏幕 */
html {
    font-size: 16px;
}

/* 移动端样式 */
@media (max-width: 767px) {
    html {
        font-size: 14px;
    }
}

/* 平板样式 */
@media (min-width: 768px) and (max-width: 1023px) {
    html {
        font-size: 15px;
    }
}

/* 桌面端普通屏幕样式 */
@media (min-width: 1024px) and (max-width: 2559px) {
    html {
        font-size: 16px;
    }
}

/* 2K 屏幕样式 */
@media (min-width: 2560px) and (max-width: 3839px) {
    html {
        font-size: 20px;
    }
}

/* 4K 屏幕样式 */
@media (min-width: 3840px) {
    html {
        font-size: 24px;
    }
}
</style>
