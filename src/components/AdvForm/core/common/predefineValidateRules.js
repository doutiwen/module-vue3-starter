const predefineValidateRules = {
  required: {
    notice(label) {
      return `${label}是必填项`;
    },
  },

  number: {
    pattern: /^\d+(\.\d+)?$/,
    notice(label) {
      return `${label}必须是数字`;
    },
  },

  intNumber: {
    pattern: /^\d+$/,
    notice(label) {
      return `${label}必须是整数`;
    },
  },

  email: {
    pattern: /^\w+@\w+\.(com|net|cn|com\.cn)$/g,
    notice(label) {
      return '必须是正确的邮箱格式';
    },
  },

  phone: {
    pattern: /^(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}$/g,
    notice(label) {
      return '必须是正确的手机号码格式';
    },
  },

  peopleIdNum: {
    validateFn(rule, value, formData) {
      if (
        /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(
          value
        ) ||
        /^[1-9]\d{5}\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{2}$/.test(value)
      ) {
        return true;
      } else {
        return false;
      }
    },
    notice(label) {
      return '必须是正确的身份证号码';
    },
  },

  minMax(min, max) {
    return {
      validateFn(value) {
        return value;
      },
      notice(label) {
        return '必须是正确的身份证号码';
      },
    };
  },

  // 验证两个字段值是否一致，targetFieldName: 目标字段名
  sameWith(targetFieldName) {
    return {
      validateFn(rule, value, formData) {
        return value === formData[targetFieldName];
      },
      notice(label) {
        return `${label}输入不一致`;
      },
    };
  },
};

export default predefineValidateRules;