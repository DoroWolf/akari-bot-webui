<template>
  <div class="log-viewer-container">
    <div class="filter-container">
      <el-input
        v-model="searchText"
        placeholder="搜索日志……"
        class="platform-tag-input"
        @input="handleSearch"
        clearable
        :style="{ width: '100%' }"
      />

      <el-button
        v-for="(level, index) in logLevels"
        :key="index"
        :class="[
          'log-level-button',
          level.toLowerCase(),
          { active: activeLogLevels.includes(level) },
        ]"
        @click="toggleLogLevel(level)"
      >
        {{ level }}
      </el-button>
    </div>

    <div class="log-viewer" ref="logViewer">
      <div
        v-for="(logLine, index) in visibleLogs"
        :key="index"
        v-html="logLine"
      ></div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { debounce } from "lodash";
import { ElButton, ElInput, ElMessage } from "element-plus";
import axios from "axios";
import DOMPurify from "dompurify";

export default {
  name: "LogsView",
  components: {
    ElButton,
    ElInput,
  },
  setup() {
    const logData = ref("");
    const visibleLogs = ref([]);
    const logViewer = ref(null);
    const logLevels = ref([
      "DEBUG",
      "INFO",
      "SUCCESS",
      "WARNING",
      "ERROR",
      "CRITICAL",
    ]);
    const activeLogLevels = ref([
      "INFO",
      "SUCCESS",
      "WARNING",
      "ERROR",
      "CRITICAL",
    ]);
    const searchText = ref("");
    const websocket = ref(null);
    const cancelTokenSource = axios.CancelToken.source();

    const authenticateToken = async () => {
      try {
        const response = await axios.get("/api/verify-token", {
          cancelToken: cancelTokenSource.token,
        });

        if (response.status === 200) {
          connectWebSocket();
        } else {
          ElMessage.error("身份验证失败");
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Request canceled", error.message);
        } else {
          ElMessage.error("身份验证失败");
        }
      }
    };

    const connectWebSocket = () => {
      try {
        let baseUrl = process.env.VUE_APP_API_URL;

        // 如果 VUE_APP_API_URL 中没有协议部分，默认为 http://
        if (!/^https?:\/\//i.test(baseUrl)) {
          baseUrl = "http://" + baseUrl;
        }

        // 使用 URL 对象解析并处理协议
        const url = new URL(baseUrl);

        const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${url.hostname}:${url.port}/ws/logs`;

        websocket.value = new WebSocket(wsUrl);

        websocket.value.onopen = () => {
          websocket.value.send(JSON.stringify({ type: "auth" }));
        };

        websocket.value.onmessage = (event) => {
          logData.value += event.data + "\n";
        };

        websocket.value.onerror = () => {
          ElMessage.error("与服务端的连接中断");
        };
      } catch (error) {
        ElMessage.error("获取日志内容失败: " + error.message);
      }
    };

    const updateLogs = debounce(() => {
      const rawLines = logData.value.split("\n");
      let buffer = "";
      const formattedLines = [];

      rawLines.forEach((line) => {
        if (/^\[.*?\]\[.*?\]\[.*?\]\[.*?\]:/.test(line)) {
          if (buffer) formattedLines.push(formatLogLine(buffer));
          buffer = line;
        } else {
          buffer += "\n" + line;
        }
      });

      if (buffer) formattedLines.push(formatLogLine(buffer));

      visibleLogs.value = formattedLines.filter((logLine) => {
        const textMatch = searchText.value
          ? logLine.toLowerCase().includes(searchText.value.toLowerCase())
          : true;

        return (
          textMatch &&
          activeLogLevels.value.some((level) => logLine.includes(level))
        );
      });
    }, 500);

    const formatLogLine = (logLine) => {
      const logPattern =
        /^\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]:(.*)$/s;
      const match = logLine.match(logPattern);

      const logPlatformColor = "#11a8cd";
      const logModulesColor = "#e5e510";
      const logDatetimeColor = "#0dbc79";
      let logContentColor = "#fff";
      let logBackgroundColor = "transparent";

      if (match) {
        const [, logPlatform, logModules, logDatetime, logLevel, logContent] =
          match;

        switch (logLevel) {
          case "DEBUG":
            logContentColor = "#3b8ec9";
            break;
          case "INFO":
            logContentColor = "#fff";
            break;
          case "SUCCESS":
            logContentColor = "#23d18b";
            break;
          case "WARNING":
            logContentColor = "#f5f543";
            break;
          case "ERROR":
            logContentColor = "#f14c4c";
            break;
          case "CRITICAL":
            logContentColor = "#fff";
            logBackgroundColor = "#cd3131";
            break;
        }

        const safeContent = DOMPurify.sanitize(logContent);

        return (
          `<span style="color:${logPlatformColor}">[${logPlatform}]</span>` +
          `<span style="color:${logModulesColor}">[${logModules}]</span>` +
          `<span style="color:${logDatetimeColor}">[${logDatetime}]</span>` +
          `<span style="color:${logContentColor}; background-color:${logBackgroundColor}">[${logLevel}]:${safeContent.replace(/\n/g, "<br>")}</span>`
        );
      }
      return `<span style="color:${logContentColor}">${logLine.replace(/\n/g, "<br>")}</span>`;
    };

    const toggleLogLevel = (level) => {
      if (activeLogLevels.value.includes(level)) {
        activeLogLevels.value = activeLogLevels.value.filter(
          (item) => item !== level,
        );
      } else {
        activeLogLevels.value.push(level);
      }
      updateLogs();
    };

    const handleSearch = () => {
      updateLogs();
    };

    onMounted(() => {
      authenticateToken();
    });

    watch(logData, updateLogs);

    onBeforeUnmount(() => {
      if (websocket.value) {
        websocket.value.close();
      }
      cancelTokenSource.cancel("Component unmounted");
    });

    return {
      logData,
      visibleLogs,
      logViewer,
      logLevels,
      activeLogLevels,
      searchText,
      updateLogs,
      toggleLogLevel,
      handleSearch,
    };
  },
};
</script>

<style scoped>
.log-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.filter-container {
  padding: 10px;
  background-color: #c8c8c8;
  border-radius: 8px;
  margin-bottom: 10px;
}

body.dark-mode .filter-container {
  background-color: #5a5a5a;
}

.el-button {
  margin: 5px;
  background-color: transparent;
}

.el-input {
  width: 100%;
  margin-top: 5px;
  margin-bottom: 5px;
}

.log-level-button.debug {
  color: #3b8ec9;
  border: 2px solid #3b8ec9;
}

.log-level-button.debug.active {
  color: white;
  background-color: #3b8ec9;
}

.log-level-button.info {
  color: #fff;
  border: 2px solid #fff;
}

.log-level-button.info.active {
  color: #333;
  background-color: #fff;
}

.log-level-button.success {
  color: #23d18b;
  border: 2px solid #23d18b;
}

.log-level-button.success.active {
  color: #333;
  background-color: #23d18b;
}
.log-level-button.warning {
  color: #f5f543;
  border: 2px solid #f5f543;
}

.log-level-button.warning.active {
  color: #333;
  background-color: #f5f543;
}

.log-level-button.error {
  color: #f14c4c;
  border: 2px solid #f14c4c;
}

.log-level-button.error.active {
  color: #fff;
  background-color: #f14c4c;
}

.log-level-button {
  color: #cd3131;
  border: 2px solid #cd3131;
}

.log-level-button.critical.active {
  color: #fff;
  background-color: #cd3131;
  border: 2px solid #fff;
}

.log-viewer {
  flex-grow: 1;
  height: 60vh;
  overflow-y: auto;
  border-radius: 8px;
  background-color: #0c0c0c;
  color: #fff;
  padding: 10px;
  font-family: monospace;
  white-space: pre-wrap;
}
</style>
