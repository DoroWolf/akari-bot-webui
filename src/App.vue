<template>
  <div id="app">
    <div class="loading-overlay"
    v-if="userVerified === null"
    v-loading="userVerified === null"
    ></div>
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <LoginModal v-if="userVerified == false" />
    <SuggestSetPasswordModal v-model="showSuggestPasswordModal" />
    <div
      v-if="isSidebarVisible && windowWidth <= 1024"
      class="sidebar-overlay"
      @click="closeSidebar"
    ></div>
    <AppSidebar
      :class="['sidebar', { show: isSidebarVisible }]"
      @menuSelect="handleMenuSelect"
    />
    <el-container :style="{ marginTop: '60px' }">
      <el-main
        :class="[
          'content',
          {
            'content-with-sidebar': isSidebarVisible,
            'show-sidebar': isSidebarVisible && windowWidth <= 1024,
          },
        ]"
        :style="{ marginLeft: sidebarMarginLeft }"
      >
        <component
          :is="currentView"
          v-if="userVerified"
          :userVerified="userVerified"
        ></component>
      </el-main>
      <div class="content-footer"></div>
    </el-container>
  </div>
</template>

<script>
import axios from "@/axios";
import AppSidebar from "./components/Sidebar.vue";
import AppHeader from "./components/Header.vue";
import LoginModal from "./components/LoginModal.vue";
import SuggestSetPasswordModal from "./components/SuggestSetPasswordModal.vue";
import { ElMessage } from 'element-plus';
import Cookies from "js-cookie";

export default {
  components: {
    AppHeader,
    AppSidebar,
    LoginModal,
    SuggestSetPasswordModal,
  },
  data() {
    return {
      currentView: null,
      userVerified: null,
      isSidebarVisible: true,
      showSuggestPasswordModal: false,
      windowWidth: window.innerWidth,
      cancelTokenSource: axios.CancelToken.source(),
    };
  },
  computed: {
    sidebarMarginLeft() {
      return this.isSidebarVisible ? "200px" : "0";
    },
  },
  mounted() {
    this.updateSidebarVisibility();
    window.addEventListener("resize", this.updateSidebarVisibility);
    this.initializeUserVerification();
  },
  watch: {
    "$route.name": "loadCurrentView",
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.updateSidebarVisibility);
  },
  methods: {
    async initializeUserVerification() {
      try {
        const response = await axios.get("/api/verify-token");
        if (response.status === 200) {
          this.userVerified = true;

          const noPassword = response.data.no_password;
          
          const promptDisabled = localStorage.getItem("noPasswordPromptDisabled") === "true";
          if (noPassword && !promptDisabled) {
            this.showSuggestPasswordModal = true;
          }

          await this.checkCsrfToken();
          this.loadCurrentView(this.$route.name);
        } else {
          this.checkPassword();
        }
      } catch (error) {
        this.checkPassword();
      }
    },
    async checkPassword() {
      try {
        const response = await axios.post("/api/auth", {});
        if (response.status === 200) {
          this.userVerified = true;

          const noPassword = response.data.no_password;
          localStorage.setItem("noPassword", JSON.stringify(response.data.no_password));
          
          const promptDisabled = localStorage.getItem("noPasswordPromptDisabled") === "true";
          if (noPassword && !promptDisabled) {
            this.showSuggestPasswordModal = true;
          }

          await this.checkCsrfToken();
          this.loadCurrentView(this.$route.name);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          this.userVerified = false;
        } else if (error.response?.status === 403) {
          this.userVerified = false;
          ElMessage.error("登录失败次数过多，请稍后再试");
        } else {
          ElMessage.error("请求失败：" + error.message);
        }
      }
    },
    async checkCsrfToken() {
      const config = await (await fetch("/config.json")).json();
      const enableHTTPS = config.enable_https;
      
      let csrfToken = Cookies.get("XSRF-TOKEN");

      if (csrfToken) {
        axios.defaults.headers.common["X-XSRF-TOKEN"] = csrfToken;
      } else {
        const response = await axios.get("/api/get-csrf-token");

        if (response.status === 200) {
          const csrfTokenFromResponse = response.data.csrf_token;

          if (csrfTokenFromResponse) {
            Cookies.set("XSRF-TOKEN", csrfTokenFromResponse, {
              expires: 60 / (24 * 60),
              sameSite: "Strict",
              secure: enableHTTPS,
            });

            let csrfToken = Cookies.get("XSRF-TOKEN");
            axios.defaults.headers.common["X-XSRF-TOKEN"] = csrfToken;
          }
        }
      }
    },
    updateSidebarVisibility() {
      this.windowWidth = window.innerWidth;
      this.isSidebarVisible = this.windowWidth > 1024;
    },
    handleMenuSelect(view) {
      const viewComponent = `${view.charAt(0).toUpperCase() + view.slice(1)}View`;
      import(`./views/${viewComponent}.vue`).then((module) => {
        this.currentView = module.default;
        this.$router.push({ name: view });
      });
    },
    toggleSidebar() {
      if (this.windowWidth <= 1024) {
        this.isSidebarVisible = !this.isSidebarVisible;
      }
    },
    closeSidebar() {
      this.isSidebarVisible = false;
    },
    loadCurrentView(newRouteName) {
      if (this.userVerified) {
        const viewMap = {
          dashboard: "Dashboard",
          config: "Config",
          data: "Data",
          logs: "Logs",
          chat: "Chat",
          setting: "Setting",
          about: "About",
        };
        const viewName = viewMap[newRouteName] || "Empty";
        import(`./views/${viewName}View.vue`).then((module) => {
          this.currentView = module.default;
        });
      }
    },
  },
};
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
}

.content {
  top: 60px;
  overflow-y: auto;
  background-color: transparent;
  z-index: 0;
  transition:
    margin-left 0.3s,
    transform 0.3s;
}

.content-with-sidebar {
  margin-left: 200px;
}

.content-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: white;
  z-index: -1;
}
.dark .content-footer {
  background-color: #181818;
}

.sidebar {
  position: fixed;
  top: 60px;
  left: 0;
  bottom: 0;
  width: 200px;
  background-color: white;
  z-index: 100;
  transition: transform 0.3s ease-in-out;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-200px);
    transition: transform 0.3s ease-in-out;
  }

  .sidebar.show {
    transform: translateX(0px);
  }

  .content-with-sidebar {
    margin-left: 0 !important;
  }

  .sidebar-overlay {
    display: block;
  }
}

@media (min-width: 1025px) {
  .sidebar {
    left: 0;
  }

  .content-with-sidebar {
    margin-left: 200px;
  }

  .sidebar-overlay {
    display: none;
  }
}
</style>
