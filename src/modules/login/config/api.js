const sourceUserPermissionList = import.meta.glob([
  '../../../modules/**/*.{vue,jsx,tsx}',
  '!../../../modules/**/config/**',
  '!../../../modules/**/common/**',
  '!../../../modules/{login,404}/**',
]);

const loginApi = {
  login: {
    url: '/api/login',
    method: 'post',
    mock: {
      resData() {
        const permission = {};
        Object.keys(sourceUserPermissionList).forEach((path) => {
          const modulePath = path
            .replace(/^(\.\.\/){2}|\.(vue|jsx|tsx)$/g, '')
            .replace(/\/index/g, '');
          permission[modulePath] = {
            buttons: [],
            recordList: [],
            form: [],
            other: [],
          };
          if (modulePath === 'example') {
            permission[modulePath].buttons.push('add', 'batchExport', 'dispatchWorkers', 'rectify');
          }
        });

        return {
          id: '1',
          userName: 'admin',
          token: 'token',
          expire: '1h',
          permission,
        };
      },
    },
  },
};

export default loginApi;
