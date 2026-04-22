const uploadProps = {
  moduleValue: {
    type: [Object, Array],
  },
  limitType: {
    type: [String, Array],
  },
  limitNum: {
    type: Number,
    default: 1,
  },
  limitSize: {
    //单位为KB,1024为1M
    type: Number,
    default: 2048,
  },
  hasPreview: {
    type: Boolean,
    default: true,
  },
  previewWidth: {
    type: String,
    default: '1000px',
  },
  uploadFn: {
    type: Function,
  },
};
const uploadEmits = ['update:moduleValue'];

const useUpload = (props, emits) => {
  const imgTypeExts = ['.jpg', '.png', '.jpeg', '.gif'];
  const _limitType = computed(() => {
    const typeList = [];
    let hasImg = false;
    if (!props.limitType) {
      hasImg = true;
    } else {
      if (Array.isArray(props.limitType)) {
        props.limitType.foreach((i) => {
          if (i === 'img') {
            hasImg = true;
          } else {
            typeList.push(`.${i}`);
          }
        });
      } else if (typeof props.limitType === 'string') {
        if (props.limitType === 'img') {
          hasImg = true;
        } else {
          typeList.push(`.${props.limitType}`);
        }
      }
    }
    if (hasImg) {
      typeList.push(...imgTypeExts);
    }
    return typeList;
  });
  const limitTypeString = computed(() => _limitType.value.join(','));
  const showPreviewModal = ref(false);
  const previewInfo = ref({
    title: '详情',
    data: null,
  });

  const validateFileType = (file) => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.slice(fileName.lastIndexOf('.'));
    const fileMimeType = `.${file.type
      .toLowerCase()
      .slice(file.type.toLowerCase().lastIndexOf('/') + 1)}`;
    const isTypeValid =
      _limitType.value.includes(fileExtension) && _limitType.value.includes(fileMimeType);
    const notice = isTypeValid
      ? ''
      : `文件类型错误，请上传${_limitType.value.join('、')}格式的文件。`;
    return { valid: isTypeValid, notice };
  };

  const formatFileSize = (Kbytes, decimal = 2) => {
    if (!Kbytes || isNaN(Kbytes)) return '0B';
    const units = [/* 'B',  */ 'KB', 'MB', 'GB']; //从KB开始
    let size = Kbytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(decimal)}${units[unitIndex]}`;
  };
  const maxSizeString = computed(() => {
    return formatFileSize(props.limitSize);
  });

  const validateFileSize = (file) => {
    const fileSizeBytes = file.size / 1024;
    const isValid = fileSizeBytes <= props.limitSize;
    const formattedFileSize = formatFileSize(fileSizeBytes);
    const notice = isValid
      ? ''
      : `文件「${file.name}」大小${formattedFileSize}，超出最大限制${maxSizeString.value}。`;
    return { valid: isValid, notice };
  };

  const beforeUploadHandler = (file) => {
    const validateFnList = [validateFileType, validateFileSize];
    let allNotice = '',
      isValid = true;
    for (const validateFn of validateFnList) {
      const { valid, notice } = validateFn(file);
      if (!valid) {
        isValid = false;
        allNotice += notice;
      }
    }
    return {
      valid: isValid,
      notice: allNotice,
    };
  };
  const _moduleValue = computed({
    get: () => {
      if (Array.isArray(props.moduleValue)) {
        return props.moduleValue;
      } else if (typeof props.moduleValue === 'object') {
        return [props.moduleValue];
      } else {
        return [];
      }
    },
    set: (val) => {
      if (val) {
        if (Array.isArray(val)) {
          return props.moduleValue;
        } else if (typeof props.moduleValue === 'object') {
          return [props.moduleValue];
        }
      } else {
        emits('update:moduleValue', val);
      }
    },
  });

  const editUploadItemHandler = (file) => {};

  const previewUploadItemHandler = (file) => {
    console.log('上传预览', file);
    const formItemKey = formItemConfig.key;
    const uid = file.uid;
    const uploadItem = state.formDataState.value[formItemKey].find((i) => i.uid === uid);
    const previewInfo = state.uploadPreviewInfo.value[formItemKey];
    previewInfo.value.name = uploadItem[Symbol.for('data')].name;
    previewInfo.value.url = uploadItem[Symbol.for('data')].url;
    previewInfo.value.show = true;
  };
  const deleteUploadItemHandler = (file) => {
    const uid = file.uid;
    const removeIndex = state.formDataState.value[key].findIndex((i) => i.uid === uid);
    state.formDataState.value[key].splice(removeIndex, 1);
  };
  const uploadHandler = (file) => {
    if (props.uploadFn) {
      props.uploadFn(file);
    }
  };

  const defineExposeConfig = {};

  return {
    _moduleValue,
    limitTypeString,
    showPreviewModal,
    previewInfo,
    editUploadItemHandler,
    previewUploadItemHandler,
    deleteUploadItemHandler,
    beforeUploadHandler,
    uploadHandler,
    defineExposeConfig,
  };
};

export { useUpload, uploadProps, uploadEmits };
