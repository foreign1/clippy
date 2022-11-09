<template>
  <div class="hello">
    <p v-if="isNoticeActive" class="notify">{{ notice }}</p>
    <p>{{ msg }}</p>
    <div class="actions">
      <button @click="copyToClipboard">Copy text</button>
      <button @click="deleteItem">Delete</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "ClipItem",
  props: {
    msg: String,
    index: Number,
    deleteClipItem: Function,
  },
  data() {
    return {
      isNoticeActive: false,
      notice: "Text copied to clipboard",
    };
  },
  methods: {
    copyToClipboard() {
      this.isNoticeActive = !this.isNoticeActive;
      navigator.clipboard.writeText(this.msg);
      setTimeout(() => (this.isNoticeActive = !this.isNoticeActive), 2000);
    },
    deleteItem() {
      this.deleteClipItem(this.$vnode.key);
    },
  },
  watch: {},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
