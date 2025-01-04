<template>
  <el-header class="header" :class="{ 'dark-mode': isDarkMode }">
    <div class="header-left">
      <el-button
        class="menu-button"
        @click="switchSidebar"
        v-if="screenWidth < 1024"
      >
        <i class="mdi mdi-menu"></i>
      </el-button>
      <div class="logo">
        <img src="@/assets/logo.png" alt="Logo" class="logo-image" />
        <div class="logo-text">
          <span class="akari-bot-text">AkariBot</span>
          <div class="webui-container">
            <span class="web-ui-text">WebUI </span>
            <span class="beta-tag">Alpha</span>
          </div>
        </div>
      </div>
    </div>
    <div class="header-right">
      <el-button class="help-button" @click="goToHelp">帮助文档</el-button>
      <el-button class="theme-toggle-button" @click="toggleDarkMode">
        <i
          :class="
            isDarkMode ? 'mdi mdi-weather-sunny' : 'mdi mdi-weather-night'
          "
        ></i>
      </el-button>
    </div>
  </el-header>
</template>

<script>
export default {
  name: "AppHeader",
  emits: ["toggle-dark-mode", "toggle-sidebar"],
  data() {
    return {
      isDarkMode: false,
      screenWidth: window.innerWidth, // 初始屏幕宽度
    };
  },
  mounted() {
    const savedTheme = localStorage.getItem("isDarkMode");
    if (savedTheme !== null) {
      this.isDarkMode = JSON.parse(savedTheme);
    }
    if (this.isDarkMode) {
      document.body.classList.add("dark-mode");
    }

    // 监听窗口大小变化
    window.addEventListener("resize", this.updateScreenWidth);
  },
  beforeUnmount() {
    // 组件销毁时移除事件监听
    window.removeEventListener("resize", this.updateScreenWidth);
  },
  methods: {
    // 更新屏幕宽度的方法
    updateScreenWidth() {
      this.screenWidth = window.innerWidth;
    },
    goToHelp() {
      window.open("https://bot.teahouse.team", "_blank");
    },
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      document.body.classList.toggle("dark-mode", this.isDarkMode);
      localStorage.setItem("isDarkMode", JSON.stringify(this.isDarkMode));
      this.$emit("toggle-dark-mode", this.isDarkMode);
    },
    switchSidebar() {
      this.$emit("toggle-sidebar");
    },
  },
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: white;
  height: 60px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  border-bottom: 1px solid #e0e0e0;
}

.header.dark-mode {
  background-color: #333;
  color: white;
  border-bottom: 1px solid #1f1f1f;
}

.menu-button {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 24px;
  color: inherit;
  transition: color 0.3s ease;
}

.menu-button:hover {
  background-color: #bbb;
  color: #555;
}

body.dark-mode .menu-button:hover {
  background-color: #444;
  color: #aaa;
}

.theme-toggle-button {
  background-color: #2e2e2e;
  color: white;
}

body.dark-mode .theme-toggle {
  background: white;
  color: #333;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 22px;
  font-weight: bold;
  display: flex;
  justify-content: left;
  padding: 20px 0;
}

.logo-image {
  height: 46px;
  width: auto;
  margin-right: 2px;
}

.logo-text {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.akari-bot-text {
  font-size: 18px;
}

.webui-container {
  display: flex;
  align-items: center;
  gap: 3px;
}

.web-ui-text {
  font-size: 12px;
  color: #888;
}

.beta-tag {
  display: inline-block;
  background-color: #ff5100; /* 蓝色背景 */
  color: white; /* 白色文字 */
  font-size: 8px;
  padding: 1px 5px;
  border-radius: 12px; /* 圆角 */
  text-transform: uppercase;
}

.theme-toggle-button {
  font-size: 22px;
  padding: 6px;
  background-color: #2e2e2e;
  color: white;
  border: none;
}

.theme-toggle-button:hover {
  background-color: #666;
  color: white;
}

body.dark-mode .theme-toggle-button {
  background-color: #eee;
  color: #333;
}

body.dark-mode .theme-toggle-button:hover {
  background-color: #c0c0c0;
  color: #333;
}
</style>
