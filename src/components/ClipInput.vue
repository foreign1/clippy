<template>
  <div class="container">
    <input type="text" v-model="userInput" @keyup.enter="addToClipboard" />
  </div>
</template>
<script>
export default {
  name: "ClipInput",
  props: {
    addClipItem: {
      type: Function,
      required: true,
    },
  },
  data() {
    return {
      userInput: "",
    };
  },
  methods: {
    addToClipboard() {
      this.addClipItem(this.userInput);
      this.userInput = "";
    },
  },
};
</script>
