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
            <slot v-if="headItemConfig.type == 'custom'" :name="headItemConfig.key"></slot>
            <a-input
              v-else-if="headItemConfig.type === 'input'"
              v-model:value="formData[headItemConfig.key]"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            >
              <template v-if="$slots[`input-addonAfter-${headItemConfig.key}`]" #addonAfter>
                <slot :name="`input-addonAfter-${headItemConfig.key}`"></slot>
              </template>
            </a-input>
            <a-select
              v-else-if="headItemConfig.type === 'select'"
              v-model:value="formData[headItemConfig.key]"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            >
              <a-select-option
                v-for="optionItem in headItemConfig.options"
                :key="optionItem.value"
                :value="optionItem.value"
                v-bind="optionItem.optionAttrs"
              >
                {{ optionItem.label }}
              </a-select-option>
            </a-select>
            <a-tree-select
              v-else-if="headItemConfig.type === 'treeSelect'"
              v-model:value="formData[headItemConfig.key]"
              :placeholder="headItemConfig.placeholder"
              :tree-data="headItemConfig.options"
              :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
              v-bind="headItemConfig.attrs"
            />
            <a-checkbox-group
              v-else-if="headItemConfig.type === 'checkbox'"
              v-model:value="formData[headItemConfig.key]"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :options="headItemConfig.options"
              :placeholder="headItemConfig.placeholder"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            />
            <a-date-picker
              v-else-if="headItemConfig.type === 'date'"
              :mode="headItemConfig.type"
              v-model:value="formData[headItemConfig.key]"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              valueFormat="YYYY-MM-DD"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            />
            <a-time-picker
              v-else-if="headItemConfig.type === 'time'"
              :mode="headItemConfig.type"
              v-model:value="formData[headItemConfig.key]"
              :range="headItemConfig.range"
              @focus="toolBarFormItemFocusHandler()"
              @blur="toolBarFormItemBlurHandler()"
              :placeholder="headItemConfig.placeholder"
              valueFormat="HH:mm:ss"
              v-bind="headItemConfig.attrs"
              v-on="headItemConfig.events"
            />
            <template v-if="headItemConfig.type === 'batch'">
              <a-button
                v-show="!currentBatchInfo"
                @click="toolBarButtonClickEventHandler(headItemConfig, 'entry')"
                v-bind="headItemConfig.attrs"
              >
                {{ headItemConfig.text }}
              </a-button>
              <a-button
                v-show="currentBatchInfo && currentBatchInfo.key === headItemConfig.key"
                @click="toolBarButtonClickEventHandler(headItemConfig, 'ok')"
                v-bind="headItemConfig.ok.attrs"
              >
                {{ headItemConfig.ok.text }}
              </a-button>
              <a-button
                v-show="currentBatchInfo && currentBatchInfo.key === headItemConfig.key"
                @click="toolBarButtonClickEventHandler(headItemConfig, 'cancel')"
                v-bind="headItemConfig.cancel.attrs"
              >
                {{ headItemConfig.cancel.text }}
              </a-button>
            </template>
            <a-button
              v-else-if="headItemConfig.type === 'openModal'"
              @click="toolBarButtonClickEventHandler(headItemConfig)"
              v-bind="headItemConfig.attrs"
            >
              {{ headItemConfig.text }}
            </a-button>
            <a-button
              v-else-if="headItemConfig.type === 'button'"
              :loading="buttonLoadingInfo[headItemConfig.key]"
              @click="toolBarButtonClickEventHandler(headItemConfig)"
              v-bind="headItemConfig.attrs"
            >
              {{ headItemConfig.text }}
            </a-button>
            <template v-else-if="headItemConfig.type === 'searchButton'">
              <a-button
                :loading="buttonLoadingInfo[`${headItemConfig.key}-search`]"
                :disabled="buttonLoadingInfo[`${headItemConfig.key}-clear`]"
                @click="toolBarButtonClickEventHandler(headItemConfig, 'search')"
                type="primary"
                v-bind="headItemConfig.attrs"
              >
                {{ headItemConfig.text }}
              </a-button>
              <a-button
                :loading="buttonLoadingInfo[`${headItemConfig.key}-clear`]"
                :disabled="buttonLoadingInfo[`${headItemConfig.key}-search`]"
                @click="toolBarButtonClickEventHandler(headItemConfig, 'clear')"
              >
                清空
              </a-button>
            </template>
            <a-upload
              v-else-if="headItemConfig.type === 'import'"
              :beforeUpload="(file) => toolBarButtonClickEventHandler(headItemConfig, file)"
              accept=".xlsx"
              :disabled="buttonLoadingInfo[headItemConfig.key]"
              :showUploadList="false"
              v-bind="headItemConfig.attrs"
            >
              <a-button :loading="buttonLoadingInfo[headItemConfig.key]">
                {{ headItemConfig.text }}
              </a-button>
            </a-upload>
            <a-button
              v-else-if="headItemConfig.type === 'download'"
              @click="toolBarButtonClickEventHandler(headItemConfig)"
              v-bind="headItemConfig.attrs"
            >
              {{ headItemConfig.text }}
            </a-button>
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
