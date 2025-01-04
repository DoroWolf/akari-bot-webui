<template>
  <div class="editor-container">
    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane
        v-for="file in configFiles"
        :key="file"
        :label="file"
        :name="file"
      ></el-tab-pane>
    </el-tabs>
    <div class="editor-body">
      <codemirror
        ref="editor"
        v-model="editorContent"
        :options="editorOptions"
      ></codemirror>
    </div>
    <div class="editor-footer">
      <div class="editor-actions">
        <el-button type="warning" @click="resetConfig">
          <i class="mdi mdi-restart"></i> 重置
        </el-button>
        <el-button type="success" @click="applyConfig">
          <i class="mdi mdi-content-save-outline"></i> 应用
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "@/axios";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";

export default {
  name: "ConfigView",
  props: {
    userVerified: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      activeTab: "",
      configFiles: [],
      editorContent: "",
      editorView: null,
      editorOptions: {
        lineWrapping: true,
        theme: oneDark,
        lineNumbers: true,
        scrollbarStyle: "native",
      },
      fileContents: {},
      cancelTokenSource: axios.CancelToken.source(),
    };
  },
  mounted() {
    if (this.userVerified) {
      this.fetchConfigFiles();
    }

    // 初始化 CodeMirror 编辑器
    const state = EditorState.create({
      doc: this.editorContent,
      extensions: [
        basicSetup,
        oneDark,
        EditorView.updateListener.of(this.handleEditorChange),
      ],
    });

    this.editorView = new EditorView({
      state,
      parent: this.$refs.editor,
    });
  },
  beforeUnmount() {
    this.cancelTokenSource.cancel("Component unmounted");
  },
  methods: {
    async fetchConfigFiles() {
      try {
        const response = await axios.get("/api/config", {
          cancelToken: this.cancelTokenSource.token,
        });
        this.configFiles = response.data.cfg_files;
        if (this.configFiles.length > 0) {
          this.activeTab = this.configFiles[0];
          this.fetchConfig(this.activeTab);
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Request canceled", error.message);
        } else {
          this.$message.error("无法获取配置文件列表，请稍后再试");
        }
      }
    },
    async fetchConfig(fileName, force = false) {
      if (!force && this.fileContents[fileName]) {
        this.editorContent = this.fileContents[fileName];
        this.updateEditorContent();
        return;
      }

      try {
        const response = await axios.get(`/api/config/${fileName}`, {
          cancelToken: this.cancelTokenSource.token,
        });
        this.fileContents[fileName] = response.data.content;
        this.editorContent = response.data.content;
        this.updateEditorContent();
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Request canceled", error.message);
        } else {
          this.$message.error("请求失败，请稍后再试");
        }
      }
    },
    resetConfig() {
      this.fetchConfig(this.activeTab, true);
    },
    applyConfig() {
      axios
        .post(`/api/config/${this.activeTab}`, { content: this.editorContent })
        .then(() => {
          this.$message.success("配置更新成功");
        })
        .catch(() => {
          this.$message.error("配置更新失败，请稍后再试");
        });
    },
    updateEditorContent() {
      if (this.editorView) {
        this.editorView.dispatch({
          changes: {
            from: 0,
            to: this.editorView.state.doc.length,
            insert: this.editorContent,
          },
        });
      }
    },
    handleTabClick(pane) {
      this.fetchConfig(pane.paneName);
    },
    handleEditorChange(viewUpdate) {
      const newContent = viewUpdate.state.doc.toString();
      if (this.editorContent !== newContent) {
        this.editorContent = newContent;
        this.fileContents[this.activeTab] = newContent;
      }
    },
  },
};
</script>

<style scoped>
.dark-mode .el-progress ::v-deep(.el-progress__text) {
  color: #aaa;
}

.editor-container {
  display: flex;
  flex-direction: column;
}

.dark-mode .editor-container {
  color: white;
}

.editor-container ::v-deep(.el-tabs__item) {
  color: #555;
}

.dark-mode .editor-container ::v-deep(.el-tabs__item) {
  color: #ddd;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-body {
  flex-grow: 1;
  height: 60vh;
  overflow: auto;
  border-radius: 8px;
}

::v-deep(.cm-editor) {
  height: 100%;
}

::v-deep(.cm-gutters) {
  font-family: "Consolas", "Noto Sans Mono", "Courier New", Courier, monospace;
}

::v-deep(.cm-content) {
  font-family: "Consolas", "Noto Sans Mono", "Courier New", Courier, monospace;
}

.editor-footer {
  display: flex;
  justify-content: flex-start;
  padding-top: 16px;
  flex-wrap: nowrap;
}
</style>
