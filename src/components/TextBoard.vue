<template>
  <div class="clipboard-component">
    <div>
      <textarea
        placeholder="Type or paste text to share..."
        v-model="userInput"
      ></textarea>
      <button @click="addClipItem">Add to Clippy</button>
    </div>
    <div>
      <clip-item v-for="(item, index) in clipArray" :key="index" :text="item">
      </clip-item>
    </div>
  </div>
</template>
<script>
import { eventBus } from "@/main";
import ClipItem from "./ClipItem.vue";

export default {
  name: "TextBoard",
  props: {
    clipArray: {
      type: Array,
      required: true,
    },
  },
  components: {
    ClipItem,
  },
  data() {
    return {
      userInput: "",
    };
  },
  methods: {
    addClipItem() {
      eventBus.$emit("addClipItem", { type: "text", item: this.userInput });
      this.userInput = "";
    },
  },
};
</script>
