const advModalProps = {
  config: {
    type: Array,
    required: true,
  },
};

const advModalEmits = ['modalOpen', 'modalClose', 'refreshRecordList'];

const useAdvModal = ({ config }, emits) => {
  const state = {
    modalList: ref([]),
    modalDict: computed(() => {
      const dict = {};
      for (const modalItem of state.modalList.value) {
        dict[modalItem.key] = modalItem;
      }
      return dict;
    }),
  };

  const setFormRef = (key, ref) => {
    const modalItem = state.modalDict.value[key];
    modalItem.formRef = ref;
  };
  const openModal = (key, payload, title) => {
    const modalItem = state.modalDict.value[key];
    if (title) {
      modalItem.title = title;
    }
    if (modalItem.form) {
      if (getVarType(modalItem.getDataFn) === 'asyncFunction') {
        modalItem.loading = true;
        const getDataParams = (modalItem.data = payload);
        modalItem
          .getDataFn(getDataParams)
          .then((res) => {
            modalItem.formData = res;
          })
          .finally(() => {
            modalItem.loading = false;
          });
      } else {
        if (typeof modalItem.getDataFn === 'function') {
          const getDataParams = (modalItem.data = payload);
          modalItem.formData = modalItem.getDataFn(getDataParams);
        } else if (payload) {
          modalItem.formData = modalItem.data = JSON.parse(JSON.stringify(payload));
        }
      }
    } else {
      if (getVarType(modalItem.getDataFn) === 'asyncFunction') {
        modalItem.loading = true;
        const getDataParams = payload;
        modalItem
          .getDataFn(getDataParams)
          .then((res) => {
            modalItem.data = res;
          })
          .finally(() => {
            modalItem.loading = false;
          });
      } else {
        if (typeof modalItem.getDataFn === 'function') {
          const getDataParams = payload;
          modalItem.data = modalItem.getDataFn(getDataParams);
        } else if (payload) {
          modalItem.data = JSON.parse(JSON.stringify(payload));
        }
      }
    }
    modalItem.show = true;
    emits('modalOpen', { key: modalItem.key, data: modalItem.data });
  };
  const closeModal = (key, refreshRecordList = false) => {
    const modalItem = state.modalDict.value[key];
    modalItem.show = false;
    if (modalItem.form) {
      modalItem.formData = null;
    }
    if (refreshRecordList) {
      emits('refreshRecordList');
    }
    emits('modalClose', { key: modalItem.key, data: modalItem.data });
  };
  const modalButtonEventHandler = (key, type) => {
    const modalItem = state.modalDict.value[key];
    switch (type) {
      case 'ok': {
        if (modalItem?.okButton?.fn) {
          if (modalItem.formRef) {
            modalItem.formRef
              .submit()
              .then((res) => {
                console.log('表单保存', res);
                modalItem.okButtonLoading = true;
                if (getVarType(modalItem.okButton.fn) === 'asyncFunction') {
                  modalItem.okButton
                    .fn(modalItem.data, res)
                    .then(({ close, refreshRecordList }) => {
                      closeModal(key, refreshRecordList);
                    })
                    .finally(() => {
                      modalItem.okButtonLoading = false;
                    });
                } else if (typeof modalItem.okButton.fn === 'function') {
                  const { close, refreshRecordList } = modalItem.okButton.fn(modalItem.data, res);
                  if (close) {
                    closeModal(key, refreshRecordList);
                  }
                }
              })
              .catch(() => {});
          } else {
            if (getVarType(modalItem.okButton.fn) === 'asyncFunction') {
              modalItem.okButtonLoading = true;
              modalItem.okButton
                .fn(modalItem.data)
                .then(({ close, refreshRecordList }) => {
                  if (close) {
                    closeModal(key, refreshRecordList);
                  }
                })
                .finally(() => {
                  modalItem.okButtonLoading = false;
                });
            } else if (typeof modalItem.okButton.fn === 'function') {
              const { close, refreshRecordList } = modalItem.okButton.fn(modalItem.data);
              if (close) {
                closeModal(key, refreshRecordList);
              }
            }
          }
        } else {
          closeModal(key);
        }
        break;
      }
      case 'cancel': {
        const modalItem = state.modalDict.value[key];
        if (modalItem.cancelButton.fn) {
          const { close, refreshRecordList } = modalItem.cancelButton.fn(modalItem.data);
          if (close) {
            closeModal(key, refreshRecordList);
          }
        } else {
          closeModal(key);
        }
        break;
      }
    }
  };
  const getModalData = (key) => {
    return state.modalDict.value[key].data;
  };

  watchEffect(() => {
    if (toValue(config)) {
      toValue(config).map((sourceModalItem, index) => {
        const targetModalItem = Object.assign(
          {
            show: false,
            data: null,
            loading: false,
            okButtonLoading: false,
            okButton: {},
            cancelButton: {},
            confirmShow: false,
            formRef: null,
            formData: null,
          },
          sourceModalItem
        );
        state.modalList.value.push(targetModalItem);
      });
    }
  });

  const defineExposeConfig = {
    openModal,
    closeModal,
    getModalData,
  };

  return {
    modalList: state.modalList,
    modalDict: state.modalDict,
    setFormRef,
    openModal,
    closeModal,
    modalButtonEventHandler,
    getModalData,
    defineExposeConfig,
  };
};

export { useAdvModal, advModalProps, advModalEmits };
