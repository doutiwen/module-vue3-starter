<template>
  <div
    v-layout="{
      itemSize: 'auto,md,auto',
      xStyle: 'space-between',
      yStyle: 'flex-end',
      mb: 'md',
    }"
  >
    <template v-for="(side, index) in sideType" :key="side">
      <div v-layout="{ itemMargin: `${sideType[index ^ 0]},sm` }">
        <template v-for="headItemConfig in toolBarItemlist" :key="headItemConfig.key">
          <template
            v-if="
              headItemConfig.show &&
              (side === 'left' ? !headItemConfig.inRight : headItemConfig.inRight)
            "
          >
            <el-input
              v-if="headItemConfig.type === 'input'"
              v-model="formData[headItemConfig.key]"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            >
              <template v-if="$slots[`input-addonAfter-${headItemConfig.key}`]" #prefix>
                <slot :name="`input-addonAfter-${headItemConfig.key}`"></slot>
              </template>
            </el-input>
            <el-select
              v-else-if="headItemConfig.type === 'select'"
              v-model="formData[headItemConfig.key]"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            >
              <el-option
                v-for="optionItem in headItemConfig.options"
                :key="optionItem.value"
                :label="optionItem.label"
                :value="optionItem.value"
                v-bind="optionItem.optionAttrs"
              />
            </el-select>
            <el-tree-select
              v-else-if="headItemConfig.type === 'treeSelect'"
              v-model="formData[headItemConfig.key]"
              :placeholder="headItemConfig.placeholder"
              :tree-data="headItemConfig.options"
              :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
              v-bind="headItemConfig.attrs"
            />
            <el-checkbox-group
              v-else-if="headItemConfig.type === 'checkbox'"
              v-model="formData[headItemConfig.key]"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            >
              <el-checkbox
                v-for="checkboxItemConfig in headItemConfig.options"
                :key="checkboxItemConfig.value"
                :label="checkboxItemConfig.label"
                :value="checkboxItemConfig.value"
                v-bind="checkboxItemConfig.optionAttrs"
              />
            </el-checkbox-group>
            <el-date-picker
              v-else-if="headItemConfig.type === 'date'"
              v-model="formData[headItemConfig.key]"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              valueFormat="YYYY-MM-DD"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            />
            <el-time-picker
              v-else-if="headItemConfig.type === 'time'"
              v-model="formData[headItemConfig.key]"
              :range="headItemConfig.range"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              valueFormat="HH:mm:ss"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            />
            <template v-if="headItemConfig.type === 'batch'">
              <el-button
                v-show="!currentBatchInfo"
                @click="toolBarButtonClickEventHandler(headItemConfig, 'entry')"
                v-bind="headItemConfig.attrs"
              >
                {{ headItemConfig.text }}
              </el-button>
              <el-button-group
                v-show="currentBatchInfo && currentBatchInfo.key === headItemConfig.key"
              >
                <el-button
                  type="primary"
                  @click="toolBarButtonClickEventHandler(headItemConfig, 'ok')"
                  v-bind="headItemConfig.ok.attrs"
                >
                  {{ headItemConfig.ok.text }}
                </el-button>
                <el-button
                  @click="toolBarButtonClickEventHandler(headItemConfig, 'cancel')"
                  v-bind="headItemConfig.cancel.attrs"
                >
                  {{ headItemConfig.cancel.text }}
                </el-button>
              </el-button-group>
            </template>
            <el-button
              v-else-if="headItemConfig.type === 'openModal'"
              @click="toolBarButtonClickEventHandler(headItemConfig)"
              v-bind="headItemConfig.attrs"
            >
              {{ headItemConfig.text }}
            </el-button>
            <el-button
              v-else-if="headItemConfig.type === 'button'"
              :loading="buttonLoadingInfo[headItemConfig.key]"
              @click="toolBarButtonClickEventHandler(headItemConfig)"
              v-bind="headItemConfig.attrs"
            >
              {{ headItemConfig.text }}
            </el-button>
            <template v-else-if="headItemConfig.type === 'searchButton'">
              <el-button-group>
                <el-button
                  :loading="buttonLoadingInfo[`${headItemConfig.key}-search`]"
                  :disabled="buttonLoadingInfo[`${headItemConfig.key}-clear`]"
                  @click="toolBarButtonClickEventHandler(headItemConfig, 'search')"
                  type="primary"
                  v-bind="headItemConfig.attrs"
                >
                  {{ headItemConfig.text }}
                </el-button>
                <el-button
                  :loading="buttonLoadingInfo[`${headItemConfig.key}-clear`]"
                  :disabled="buttonLoadingInfo[`${headItemConfig.key}-search`]"
                  @click="toolBarButtonClickEventHandler(headItemConfig, 'clear')"
                >
                  清空
                </el-button>
              </el-button-group>
            </template>
            <el-upload
              v-else-if="headItemConfig.type === 'import'"
              :customRequest="(file) => toolBarButtonClickEventHandler(headItemConfig, file)"
              accept=".xlsx"
              :disabled="buttonLoadingInfo[headItemConfig.key]"
              :showUploadList="false"
              v-bind="headItemConfig.attrs"
            >
              <el-button :loading="buttonLoadingInfo[headItemConfig.key]">
                {{ headItemConfig.text }}
              </el-button>
            </el-upload>
            <el-button
              v-else-if="headItemConfig.type === 'download'"
              @click="toolBarButtonClickEventHandler(headItemConfig)"
              v-bind="headItemConfig.attrs"
            >
              {{ headItemConfig.text }}
            </el-button>
          </template>
        </template>
      </div>
    </template>
  </div>
</template>
<script setup>
  import LayoutDirectives from '@/layoutPlugin/directives/index.js';
  import { useToolBar, toolBarProps, toolBarEmits } from '../../common/index.js';

  const vLayout = new LayoutDirectives();

  const props = defineProps(toolBarProps);
  const emits = defineEmits(toolBarEmits);
  const sideType = ['left', 'right'];

  const {
    toolBarItemlist,
    formData,
    batchInfo,
    buttonLoadingInfo,
    currentBatchInfo,
    toolBarFormItemFocusHandler,
    toolBarFormItemBlurHandler,
    toolBarButtonClickEventHandler,
    defineExposeConfig,
  } = useToolBar(props, emits);

  defineExpose(defineExposeConfig);
</script>
<style lang="scss" scoped>
  .el-button + .el-button {
    margin-left: 0;
  }
</style>
