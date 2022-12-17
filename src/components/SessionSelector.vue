<template>
  <div class="onset">
    <LoaderVue v-if="loading"></LoaderVue>
    <div class="onset_header">
      <img alt="Clippy logo" src="@/assets/images/logo.png" />
      <h1 class="onset_header-text">Your clipboard companion</h1>
    </div>
    <div class="onset_card onset_join">
      <h4>Join Existing Session</h4>
      <h6 v-if="errorMessage" class="u_color--danger">{{ errorMessage }}</h6>
      <input
        class="onset_input u_margin_top-sm u_padding_lr-sm"
        type="text"
        v-model="sessionId"
        placeholder="Enter session id..."
      />
      <button
        class="onset_input u_margin_top-sm onset_btn-join"
        @click="joinSession"
      >
        Join Session
      </button>
    </div>
    <div class="onset_card onset_create">
      <h4>Create New Session</h4>
      <h6 v-if="notice" class="notice u_color--danger">{{ notice }}</h6>
      <button
        class="onset_input u_margin_top-sm onset_btn-create"
        @click="createSession"
      >
        Create Session
      </button>
    </div>
  </div>
</template>
<script>
import LoaderVue from "./Loader.vue";
export default {
  name: "SessionSelector",
  props: {
    setSession: {
      type: Function,
      required: true,
    },
  },
  components: {
    LoaderVue,
  },
  data() {
    return {
      notice: "",
      sessionId: "",
      errorMessage: "",
      loading: false,
      urlCreate: process.env.VUE_APP_CREATE_SESSION,
      urlJoin: process.env.VUE_APP_JOIN_SESSION,
    };
  },
  methods: {
    async createSession() {
      this.loading = !this.loading;
      fetch(this.urlCreate)
        .then((response) => {
          if (response.status !== 201) {
            throw new Error("Pleaase check your network connection!");
          }
          return response.json();
        })
        .then((data) => {
          const sessionId = data.sessionId;
          const confObj = data.session[data.sessionId];
          this.setSession(sessionId, confObj);
          this.loading = !this.loading;
        })
        .catch(() => {
          this.notice = `Please check your network connection!`;
          this.loading = !this.loading;
        });
    },
    async joinSession() {
      this.loading = !this.loading;
      fetch(this.urlJoin, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: this.sessionId }),
      })
        .then((response) => {
          if (response.status !== 200) {
            throw new Error("Incorrect sessionId provided");
          }
          return response.json();
        })
        .then((data) => {
          const sessionId = data.sessionId;
          const confObj = data.session[data.sessionId];
          this.setSession(sessionId, confObj);
          this.loading = !this.loading;
        })
        .catch((error) => {
          this.errorMessage = error;
          this.loading = !this.loading;
        });
    },
    // setSession(sessionId, sessionObj) {
    //   this.$emit("setSession", (sessionId, sessionObj));
    // },
  },
};
</script>
