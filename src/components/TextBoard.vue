<template>
  <div class="clipboard-component">
    <div class="inputBox">
      <textarea
        placeholder="Type or paste text to share..."
        v-model="userInput"
        class="u_brad"
      ></textarea>
      <button class="u_brad u_margin_top-xsm" @click="addClipItem">
        Add to Clippy
      </button>
    </div>
    <div class="clip-list">
      <p class="notice-empty-list" v-if="!!!clipArray.length">
        Shared list empty.<br />Add fresh content to share.
      </p>
      <template>
        <clip-item v-for="(item, index) in clipArray" :key="index" :text="item">
        </clip-item>
      </template>
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
      this.userInput &&
        eventBus.$emit("addClipItem", { type: "text", item: this.userInput });
      this.userInput = "";
    },
  },
};
</script>
