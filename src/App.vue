<template>
    <Home />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Home from "@/views/home/index.vue";
@Options({
    components: {
        Home
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
</style>
