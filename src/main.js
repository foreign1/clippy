import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import "@/assets/css/style.css";

Vue.config.productionTip = false;

export const eventBus = new Vue();

new Vue({
  render: (h) => h(App),
}).$mount("#app");
