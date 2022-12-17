<template>
  <div class="container">
    <p class="load-text">{{ loaderText }}</p>
  </div>
</template>
<script>
export default {
  name: "LoaderWidget",
  props: {
    loaderText: {
      type: String,
      default: "Loading...",
    },
  },
};
</script>
<style lang="css" scoped>
.container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.load-text {
  font-size: 30px;
  color: white;
  animation: c1 1s linear infinite alternate;
}
@keyframes c1 {
  to {
    opacity: 0;
  }
}
</style>
