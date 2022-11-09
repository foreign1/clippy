<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <ClipInput :addClipItem="addClipItem" />
    <ul>
      <ClipItem
        v-for="(item, index) in clipboard"
        :key="index"
        :msg="item"
        :addClipItem="addClipItem"
        :deleteClipItem="deleteClipItem"
      />
    </ul>
  </div>
</template>

<script>
import ClipItem from "./components/ClipItem.vue";
import ClipInput from "./components/ClipInput";

export default {
  name: "App",
  data() {
    return {
      clipboard: [],
    };
  },
  components: {
    ClipItem,
    ClipInput,
  },
  methods: {
    addClipItem(value) {
      this.clipboard.push(value);
    },
    deleteClipItem(clipItemIndex) {
      this.clipboard.splice(clipItemIndex, 1);
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
