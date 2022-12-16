<template>
  <div class="header">
    <h1>
      Session ID: {{ sessionId }}
      <button @click="copyId">{{ copyBtnText }}</button>
    </h1>
    <div>
      <!-- <span class="tab active">Text</span> -->
      <!-- <span class="tab">Image</span>
      <span class="tab">File</span> -->
    </div>
  </div>
</template>
<script>
export default {
  name: "AppHeader",
  props: { sessionId: String },
  data() {
    return {
      copyBtnText: "Copy ID",
    };
  },
  methods: {
    copyId() {
      navigator.clipboard.writeText(this.sessionId);
      this.copyBtnText = "Copied";
      setTimeout(() => (this.copyBtnText = "Copy ID"), 5000);
    },
  },
};
</script>
