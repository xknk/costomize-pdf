<template>
    <PdfView />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import PdfView from "./components/pdf.vue";
@Options({
    components: {
        PdfView
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
}
</style>
