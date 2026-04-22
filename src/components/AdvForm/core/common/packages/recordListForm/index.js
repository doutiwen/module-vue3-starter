const recordListFormProps = {
  modelValue: {
    type: Object,
  },
};
const recordListFormEmits = ['update:modelValue'];

const useRecordListForm = (props, emits) => {
  const defineExposeConfig = {};

  return {
    defineExposeConfig,
  };
};

export { useRecordListForm, recordListFormProps, recordListFormEmits };
