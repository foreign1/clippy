<template>
  <div class="clipitem">
    <p style="white-space: pre-line">{{ text }}</p>
    <div class="actions">
      <button class="u_btn--accent" @click="copyToClipboard">Copy text</button>
      <button class="u_btn--danger" @click="deleteItem">Delete</button>
    </div>
  </div>
</template>

<script>
import { eventBus } from "@/main";

export default {
  name: "ClipItem",
  props: {
    text: String,
  },
  data() {
    return {
      copyButtonText: "Copy to Clipboard",
    };
  },
  methods: {
    copyToClipboard() {
      this.isNoticeActive = !this.isNoticeActive;
      navigator.clipboard.writeText(this.text);
      this.copyButtonText = "Text copied!";
      setTimeout(() => (this.copyButtonText = "Copy to Clipboard"), 5000);
    },
    deleteItem() {
      eventBus.$emit("deleteClipItem", {
        type: "text",
        index: this.$vnode.key,
      });
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
