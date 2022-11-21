<template>
  <div id="app">
    <SessionSelector v-if="!!!sessionId" :setSession="setSession" />
    <div v-else>
      <Header :sessionId="sessionId" />
      <TextBoard :clipArray="clipboard.text" />
    </div>
  </div>
</template>

<script>
import { eventBus } from "@/main";
import SessionSelector from "@/components/SessionSelector.vue";
import TextBoard from "@/components/TextBoard.vue";
import Header from "./components/Header.vue";

export default {
  name: "App",
  data() {
    return {
      sessionId: 0,
      errorMessage: "",
      clipboard: {},
    };
  },
  components: {
    SessionSelector,
    Header,
    TextBoard,
  },
  methods: {
    setSession(sessionId, sessionObj) {
      this.sessionId = sessionId;
      this.clipboard = sessionObj;
    },
    // async loadSessionData() {
    //   const url = "http://localhost:8000/sessionData";
    //   fetch(url, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ sessionId: this.sessionId }),
    //   })
    //     .then((response) => response.json())
    //     .then((data) => (this.clipboard = data.clipboard))
    //     .catch((error) => (this.errorMessage = error));
    // },
  },
  created() {
    eventBus.$on("addClipItem", (arg) => {
      // this.clipboard[arg.type].push(arg.item);
      fetch("http://localhost:8000/addItem", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          type: arg.type,
          item: arg.item,
        }),
      }).then((response) => {
        response.status === 200 && this.clipboard[arg.type].push(arg.item);
      });
      /*
        push clipboard to /update
        if push failed, notify user "please check your network connection"
        delete last pushed item
       */
    });

    eventBus.$on("deleteClipItem", (arg) => {
      this.clipboard[arg.type].splice(arg.index, 1)[0];
      /*
        push clipboard to /update
        if push failed, notify user "Please check your network connection1"
        restore last deleted item
       */
    });
  },
};
</script>

<style>
#app {
  /* font-family: Avenir, Helvetica, Arial, sans-serif; */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  /* color: #2c3e50; */
  /* margin-top: 60px; */
}
</style>
