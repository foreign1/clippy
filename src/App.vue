<template>
  <div id="app">
    <SessionSelector v-if="!!!sessionId" :setSession="setSession" />
    <div v-else>
      <!-- <Header :sessionId="sessionId" />
      <TextBoard :clipArray="clipboard.text" /> -->
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
      urlAddItem: process.env.VUE_APP_ADD_ITEM,
      urlDeleteItem: process.env.VUE_APP_DELETE_ITEM,
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
  },
  created() {
    eventBus.$on("addClipItem", (arg) => {
      // this.clipboard[arg.type].push(arg.item);
      fetch(this.urlAddItem, {
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
        Todo:
        push clipboard to /update
        if push failed, notify user "please check your network connection"
        delete last pushed item
       */
    });

    eventBus.$on("deleteClipItem", (arg) => {
      this.clipboard[arg.type].splice(arg.index, 1)[0];
      /*
        Todo:
        push clipboard to /update
        if push failed, notify user "Please check your network connection1"
        restore last deleted item
       */
    });
  },
};
</script>
