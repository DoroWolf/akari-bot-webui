<template>
    <el-card class="user-card">
      <div class="header-container">
        <h3>{{ $t("data.user.title") }}</h3>
        <el-button
          @click="refreshData"
          type="primary"
          style="float: right; margin-left: 10px;"
        ><i class="mdi mdi-refresh"></i> {{ $t("data.button.refresh") }}</el-button>
      </div>
  
      <div class="filter-container">
        <div class="filter-item">
          <el-select
            v-model="selectedPrefix"
            clearable
          :placeholder="$t('data.select.prefix')"
            @change="debouncedRefresh"
          >
            <el-option label="QQ" value="QQ" />
            <el-option label="QQBot" value="QQBot" />
            <el-option label="Discord" value="Discord" />
            <el-option label="Telegram" value="Telegram" />
            <el-option label="KOOK" value="KOOK" />
            <el-option label="Matrix" value="Matrix" />
            <el-option label="Web" value="Web" />
            <el-option label="TEST" value="TEST" />
          </el-select>
        </div>
  
        <div class="filter-item">
          <el-select
            v-model="selectedStatus"
            clearable
            :placeholder="$t('data.select.status')"
            @change="debouncedRefresh"
          >
            <el-option :label="$t('data.user.tag.superuser')" value="superuser" />
            <el-option :label="$t('data.user.tag.trusted')" value="trusted" />
            <el-option :label="$t('data.user.tag.blocked')" value="blocked" />
          </el-select>
        </div>
  
        <div class="filter-item">
          <el-input
            v-model="platformIdPart"
            :placeholder="$t('data.user.input.sender_id')"
            @input="debouncedRefresh"
          />
        </div>
      </div>
  
      <el-table v-loading="loading" :data="senderList" style="width: 100%" stripe>
        <el-table-column prop="sender_id" :label="$t('data.user.table.sender_id')" sortable min-width="140" />
        <el-table-column prop="warns" :label="$t('data.user.table.warns')" sortable min-width="140" />
        <el-table-column prop="petal" :label="$t('data.user.table.petal')" sortable min-width="140" />
        <el-table-column :label="$t('data.table.status')" min-width="180">
          <template #default="{ row }">
            <el-tag type="primary" v-if="row.superuser">{{ $t("data.user.tag.superuser") }}</el-tag>
            <el-tag type="success" v-if="row.trusted" style="margin-left: 5px;">{{ $t("data.user.tag.trusted") }}</el-tag>
            <el-tag type="danger" v-if="row.blocked" style="margin-left: 5px;">{{ $t("data.user.tag.blocked") }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('data.user.table.sender_data')" min-width="140">
          <template #default="{ row }">
            <el-popover
              placement="top"
              width="300"
              trigger="hover"
            >
              <pre>{{ JSON.stringify(row.sender_data, null, 2) }}</pre>
              <template #reference>
                <el-button size="mini" type="text">{{ $t("data.table.text.detail") }}</el-button>
              </template>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column :label="$t('data.session.table.operation')" min-width="240">
          <template #default="{ row }">
            <el-button size="small" type="warning" @click="editSender(row)"><i class="mdi mdi-pencil"></i> {{ $t("data.button.edit") }}</el-button>
            <el-button size="small" type="danger" @click="confirmDelete(row)"><i class="mdi mdi-delete"></i> {{ $t("data.button.delete") }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    <el-pagination
      v-if="totalItems > 0"
      background
      layout="prev, pager, next"
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="totalItems"
      style="margin-top: 20px;"
      @current-change="handlePageChange"
    />
    </el-card>
  
    <el-dialog v-model="editDialogVisible" :title="$t('data.user.title.edit_sender_data')" width="600px">
      <el-form :model="editForm" label-width="auto">
        <el-row :gutter="24">
          <el-col :span="6">
            <el-form-item :label="$t('data.user.table.superuser')">
              <el-switch v-model="editForm.superuser" @change="handleSuperUserChange" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="$t('data.user.table.trust')">
              <el-switch v-model="editForm.trusted" @change="handleTrustedChange" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="$t('data.user.table.block')">
              <el-switch v-model="editForm.blocked" @change="handleBlockedChange" />
            </el-form-item>
          </el-col>
          <el-col :span="18">
            <el-form-item :label="$t('data.user.table.warns')">
              <el-input-number v-model="editForm.warns" :min="0"/>
            </el-form-item>
          </el-col>
          <el-col :span="18">
            <el-form-item :label="$t('data.user.table.petal')">
              <el-input-number v-model="editForm.petal" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="$t('data.user.table.sender_data')">
              <el-input
                type="textarea"
                resize="none"
                v-model="senderDataString"
                :rows="6"
                :placeholder="$t('data.input.json_data')"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
  
      <template #footer>
        <el-button @click="editDialogVisible = false">{{ $t("button.cancel") }}</el-button>
        <el-button type="primary" @click="submitEdit">{{ $t("button.save") }}</el-button>
      </template>
    </el-dialog>
  </template>
  
  <script>
  import axios from 'axios';
  import { ElMessage } from 'element-plus';
  import { useI18n } from 'vue-i18n';
  
  export default {
    data() {
      const { t } = useI18n();
      return {
        editForm: {
          sender_id: '',
          warns: 0,
          petal: 0,
          superuser: false,
          trusted: false,
          blocked: false,
          sender_data: {},
        },
        senderList: [],
        editDialogVisible: false,
        selectedPrefix: '',
        selectedStatus: '',
        platformIdPart: '',
        senderDataString: '',
        currentPage: 1,
        pageSize: 20,
        totalItems: 0,
        debounceTimer: null,
        loading: false,
        cancelTokenSource: axios.CancelToken.source(),
        t
      };
    },
    mounted() {
      this.refreshData()
    },
    beforeUnmount() {
      this.cancelTokenSource.cancel("Component unmounted");
    },
    methods: {
      debouncedRefresh() {
        clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(() => {
          this.refreshData();
        }, 500);
      },
    async refreshData() {
      this.currentPage = 1;
      await this.fetchData();
    },
      async fetchData() {
        this.loading = true;
        try {
          const response = await axios.get('/api/sender', {
            cancelToken: this.cancelTokenSource.token,
            params: {
              prefix: this.selectedPrefix || undefined,
              status: this.selectedStatus || undefined,
              id: this.platformIdPart || undefined,
              page: this.currentPage,
              size: this.pageSize
            }
          });
          if (response.status === 200) {
            this.senderList = response.data.sender_list;
            this.totalItems = response.data.total || 0;
          }
        } catch (error) {
          if (axios.isCancel(error)) {
            console.log("Request canceled");
          } else {
            ElMessage.error(this.t("message.error.fetch") + error);
          } 
        } finally {
            this.loading = false;
          }
      },
      handlePageChange(page) {
        this.currentPage = page;
        this.fetchData();
      },
      handleSuperUserChange(value) {
        if (value) {
          this.editForm.trusted = false;
          this.editForm.blocked = false;
        }
      },
      handleTrustedChange(value) {
        if (value) {
          this.editForm.superuser = false;
          this.editForm.blocked = false;
        }
      },
      handleBlockedChange(value) {
        if (value) {
          this.editForm.superuser = false;
          this.editForm.trusted = false;
        }
      },
      editSender(row) {
        Object.assign(this.editForm, {
          sender_id: row.sender_id,
          superuser: row.superuser,
          trusted: row.trusted,
          blocked: row.blocked,
          warns: row.warns,
          petal: row.petal,
          sender_data: row.sender_data ? { ...row.sender_data } : {},
        });
        this.senderDataString = JSON.stringify(this.editForm.sender_data, null, 2);
        this.editDialogVisible = true;
      },
      async submitEdit() {
        let parsedSenderData;
        try {
            parsedSenderData = JSON.parse(this.senderDataString);
        } catch (e) {
          ElMessage.error(this.t("data.message.invalid_json"));
        }
  
        const { sender_id, ...payload } = this.editForm;
        payload.sender_data = parsedSenderData;
  
        try {
          await axios.post(`/api/sender/${sender_id}/edit`, payload);
          ElMessage.success(this.t("data.message.success.edit"));
          this.editDialogVisible = false;
          this.fetchData();
        } catch (error) {
          ElMessage.error(this.t("message.error.fetch") + error.message);
        }
      },
      confirmDelete(row) {
        this.$confirm(this.t("data.user.confirm.message", { sender_id: row.sender_id }), this.t("confirm.warning"), {
        confirmButtonText: this.t("button.confirm"),
        cancelButtonText: this.t("button.cancel"),
        type: 'warning',
      }).then(() => {
          this.deleteSender(row);
        }).catch(() => {
          return;
        });
      },
      async deleteSender(row) {
        try {
          await axios.post(`/api/sender/${row.sender_id}/delete`);
          ElMessage.success(this.t("data.message.success.delete"));
          this.fetchData();
        } catch (error) {
          ElMessage.error(this.t("message.error.fetch") + error.message);
        }
      }
    }
  };
  </script>

<style scoped>
pre {
  font-family: "Consolas", "Noto Sans Mono", "Courier New", Courier, monospace;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.el-card {
  box-shadow: none !important;
  margin-bottom: 20px;
  line-height: 1;
  white-space: nowrap;
}

.el-button i {
margin-right: 8px;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.filter-item {
  flex: 1 1 0;
  min-width: 200px;
}
</style>
