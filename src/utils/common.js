//单例基类
export class SingletonBase {
  static instances = new WeakMap();
  constructor() {
    const CurrentClass = this.constructor;
    if (SingletonBase.instances.has(CurrentClass)) {
      return SingletonBase.instances.get(CurrentClass);
    }
    SingletonBase.instances.set(CurrentClass, this);
  }
}

export class UUId extends SingletonBase {
  constructor() {
    super();
    this.currentId = 0;
  }
  getNewId() {
    this.currentId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return this.currentId;
  }
  getCurrentId() {
    return this.currentId;
  }
}

//延迟操作
export class DelayHandle extends SingletonBase {
  constructor(key) {
    super();
    this.setTimeoutKey = Symbol.for(`delayHandle_${key}_TimerId`);
  }
  breakOff() {
    if (Reflect.has(window, this.setTimeoutKey)) {
      clearTimeout(window[this.setTimeoutKey]);
      Reflect.deleteProperty(window, this.setTimeoutKey);
    }
  }
  exceFn(delayExceFn, time = 5000) {
    this.breakOff();
    window[this.setTimeoutKey] = setTimeout(() => {
      delayExceFn();
      Reflect.deleteProperty(window, this.setTimeoutKey);
    }, time);
  }
}

//一组栈
export class StackList {
  constructor(stackNameList) {
    this.stackMap = new Map();
    for (const stackName of stackNameList) {
      if (!this.stackMap.has(stackName)) {
        this.stackMap.set(stackName, []);
      }
    }
    return new Proxy(this, {
      set() {
        throw new Error('StackList对象不允许修改');
      },
      get(target, propKey) {
        if (stackNameList.includes(propKey)) {
          const stackName = propKey;
          return {
            get(itemNum, deleteItem) {
              return target.get(stackName, itemNum, deleteItem);
            },
            add(item, itemNum, proceessFn) {
              return target.add(stackName, item, itemNum, proceessFn);
            },
            del(num) {
              return target.del(stackName, num);
            },
            moveTo(toName, itemNum, proceessFn) {
              return target.moveTo(stackName, toName, itemNum, proceessFn);
            },
            isEmpty() {
              return target.isEmpty(stackName);
            },
            edit(newValue, setterFn) {
              return target.edit(stackName, newValue, setterFn);
            },
            length: target.length(stackName),
          };
        } else {
          throw new Error(`StackList对象没有${propKey}属性`);
        }
      },
    });
  }
  getStack = (stackName) => {
    if (this.stackMap.has(stackName)) {
      return this.stackMap.get(stackName);
    } else {
      throw new Error(`没有名字为${stackName}的栈`);
    }
  };
  get = (stackName, getItemNum = 1, deleteItem = false) => {
    const targetStack = this.getStack(stackName);
    const targetItemList = [];
    if (targetStack.length >= getItemNum) {
      for (let num = 1; num <= getItemNum; num++) {
        let targetItem;
        if (deleteItem) {
          targetItem = targetStack.pop();
        } else {
          targetItem = targetStack[targetStack.length - num];
        }
        targetItemList.push(targetItem);
      }
      return getItemNum === 1 ? targetItemList[0] : targetItemList;
    } else {
      return undefined;
    }
  };
  add = (stackName, itemValue, itemNum = 1, proceessFn) => {
    const targetStack = this.getStack(stackName);
    if (Object.prototype.toString.call(itemValue).toLowerCase().includes('array]') && itemNum > 1) {
      for (const item of itemValue) {
        targetStack.push(typeof proceessFn === 'function' ? proceessFn(item) : item);
      }
    } else {
      targetStack.push(typeof proceessFn === 'function' ? proceessFn(itemValue) : itemValue);
    }
  };
  del = (stackName, num = 1) => {
    const targetStack = this.getStack(stackName);
    for (let i = 1; i <= num; i++) {
      targetStack.pop();
    }
  };
  moveTo = (fromName, toName, itemNum, proceessFn) => {
    const moveItems = this.get(fromName, itemNum, true);
    this.add(toName, moveItems, itemNum, proceessFn);
  };
  length = (stackName) => {
    const targetStack = this.getStack(stackName);
    return targetStack.length;
  };
  isEmpty = (stackName) => {
    if (this.length(stackName) === 0) {
      return true;
    } else {
      return false;
    }
  };
  edit = (stackName, newValue, setterFn) => {
    const targetItem = this.get(stackName, 1, true);
    this.add(stackName, targetItem, 1, setterFn);
  };
}

//页面关闭操作
export class BeforePageUnloadCallBack extends SingletonBase {
  constructor(callbackList) {
    super();
    this.callbackList = new Set(callbackList);
    window.onbeforeunload = (e) => {
      for (const callback of this.callbackList.values()) {
        callback();
      }
    };
  }
  add(callback) {
    this.callbackList.add(callbackList);
  }
  remove(callback) {
    this.callbackList.delete(callback);
  }
  clear() {
    this.callbackList.clear();
  }
}

//树形数据遍历器
export class TreeDataIterator {
  constructor(treeData, childrenDataKey = 'children') {
    const stackNameList = [
      'notComplete',
      'completed',
      'everyLevelChildNum',
      'everyLevelCompletedChildNum',
    ];
    const stack = new StackList(stackNameList);
    const oneTick = () => {
      const currentNode = stack.notComplete.get();
      let isContainer = false;
      let currentLevelCompleted = false;
      let handleOneNode = false;
      if (currentNode[childrenDataKey]) {
        isContainer = true;
      }
      if (!stack.everyLevelCompletedChildNum.isEmpty()) {
        if (stack.everyLevelCompletedChildNum.get() === stack.everyLevelChildNum.get()) {
          currentLevelCompleted = true;
        }
      }
      if (currentLevelCompleted) {
        const currentLevelChildNum = stack.everyLevelChildNum.get(1, true);
        stack.completed.del(currentLevelChildNum);
        stack.everyLevelCompletedChildNum.del();
        stack.notComplete.moveTo('completed', 1);
        if (stack.everyLevelCompletedChildNum.length) {
          stack.everyLevelCompletedChildNum.edit(undefined, (num) => ++num);
        }
        handleOneNode = true;
      } else {
        if (!isContainer) {
          stack.notComplete.moveTo('completed', 1);
          if (stack.everyLevelCompletedChildNum.length) {
            stack.everyLevelCompletedChildNum.edit(undefined, (num) => ++num);
          }
          handleOneNode = true;
        } else {
          let chilidNum = 0;
          for (const child of currentNode[childrenDataKey]) {
            stack.notComplete.add(child);
            chilidNum++;
          }
          stack.everyLevelChildNum.add(chilidNum);
          stack.everyLevelCompletedChildNum.add(0);
        }
      }
      return handleOneNode;
    };

    this[Symbol.iterator] = () => {
      let treeDataLength,
        currentTreeDataIndex = 0;
      if (Array.isArray(treeData)) {
        treeDataLength = treeData.length;
        if (treeDataLength) {
          stack.notComplete.add(treeData[0]);
        }
      } else {
        treeDataLength = 1;
        stack.notComplete.add(treeData);
      }
      return {
        next() {
          if (treeDataLength === 0) {
            return {
              done: true,
            };
          } else {
            if (stack.notComplete.length !== 0) {
              let handleOneNode;
              do {
                handleOneNode = oneTick();
              } while (!handleOneNode);
              return {
                value: stack.completed.get(),
              };
            } else {
              ++currentTreeDataIndex;
              if (currentTreeDataIndex === treeDataLength) {
                return {
                  done: true,
                };
              } else {
                stack.notComplete.add(treeData[currentTreeDataIndex]);
                let handleOneNode;
                do {
                  handleOneNode = oneTick();
                } while (!handleOneNode);
                return {
                  value: stack.completed.get(),
                };
              }
            }
          }
        },
      };
    };
  }
}

export class DeepObjectIterator {
  constructor(deepObject, isLeafFn) {
    const notComplete = [];
    const completed = [];
    const everyLevelChildNum = [];
    const everyLevelCompletedChildNum = [];
    const everyLevelPropKey = [];
    const oneTick = () => {
      const currentNode = notComplete.pop();
      let isLeaf = false;
      let currentLevelCompleted = false;
      let handleOneNode = false;
      if (isLeafFn(currentNode)) {
        isLeaf = true;
      }
      if (everyLevelCompletedChildNum.length) {
        if (
          everyLevelCompletedChildNum[everyLevelCompletedChildNum.length - 1] ===
          everyLevelChildNum[everyLevelChildNum.length - 1]
        ) {
          currentLevelCompleted = true;
        }
      }
      if (currentLevelCompleted) {
        const currentLevelChildNum = everyLevelChildNum.pop();
        completed.splice(-currentLevelChildNum);
        everyLevelCompletedChildNum.pop();
        completed.push(notComplete.pop());
        if (everyLevelCompletedChildNum.length) {
          everyLevelCompletedChildNum[everyLevelCompletedChildNum.length - 1]++;
        }
        handleOneNode = true;
      } else {
        if (isLeaf) {
          completed.push(notComplete.pop());
          if (everyLevelCompletedChildNum.length) {
            everyLevelCompletedChildNum[everyLevelCompletedChildNum.length - 1]++;
          }
          handleOneNode = true;
        } else {
          let chilidNum = 0;
          for (const childKey of Object.keys(currentNode)) {
            notComplete.push(currentNode[childKey]);
            chilidNum++;
          }
          everyLevelChildNum.push(chilidNum);
          everyLevelCompletedChildNum.push(0);
        }
      }
      return handleOneNode;
    };

    this[Symbol.iterator] = () => {
      notComplete.push(deepObject);
      return {
        next() {
          if (notComplete.length) {
            let handleOneNode;
            do {
              handleOneNode = oneTick();
            } while (!handleOneNode);
            return {
              value: completed[completed.length - 1],
            };
          } else {
            return {
              done: true,
            };
          }
        },
      };
    };
  }
}

class EventBusStore {
  constructor() {
    this.data = {};
    this.eventBus = {};
  }
  setData(key, data) {
    if (key) {
      set(this.data, key, data);
    } else {
      this.data = data;
    }
  }
  getData(key) {
    if (key) {
      return get(this.data, key);
    } else {
      return this.data;
    }
  }
  on(eventName, callback) {
    if (!this.eventBus[eventName]) {
      this.eventBus[eventName] = [];
    }
    const callbackList = this.eventBus[eventName];
    callbackList.push(callback);
  }
  emit(eventName, newValue, payload) {
    if (this.eventBus[eventName]) {
      for (const callback of this.eventBus[eventName]) {
        callback({
          storeData: this.data,
          eventName,
          newValue,
          other: payload || {},
        });
      }
    }
  }
  removeListener(eventName, callback) {
    if (this.eventBus[eventName]) {
      const callbackList = this.eventBus[eventName];
      const callbackIndex = callbackList.findIndex((i) => i === callback);
      if (callbackIndex !== undefined) {
        callbackList.splice(callbackIndex, 1);
      }
    }
  }
}

//vue动态watch管理器，先setWatchInfo再registerWatch使用
export class WatchManager {
  constructor(initWatchInfo) {
    this.watchInfoListMap = new Map(); //
    if (initWatchInfo) {
      for (const { key, watchSetting } of Object.keys(initWatchInfo)) {
        this.setWatchInfo(key, watchSetting);
      }
    }
  }
  //设置watch相关参数，key参数仅仅是唯一标识，不是watch对象
  setWatchInfo = (key, watchSetting) => {
    if (!this.watchInfoListMap.has(key)) {
      this.watchInfoListMap.set(key, []);
    }
    const targetWatchInfoList = this.watchInfoListMap.get(key);
    if (getVarType(watchSetting) === 'array' && getVarType(watchSetting[0]) === 'array') {
      for (const settingItem of watchSetting) {
        targetWatchInfoList.push({
          setting: settingItem,
          operate: {},
        });
      }
    } else {
      targetWatchInfoList.push({
        setting: watchSetting,
        operate: {},
      });
    }
  };
  //注册watch以生效
  registerWatch = (key) => {
    if (key && this.watchInfoListMap.has(key)) {
      const watchList = this.watchInfoListMap.get(key);
      for (const watchItem of watchList) {
        if (!watchItem.operate.stop) {
          const { stop, pause, resume } = watch(...watchItem.setting);
          Object.assign(watchItem.operate, { stop, pause, resume });
        }
      }
    } else if (!key) {
      for (const [key, watchList] of this.watchInfoListMap.entries()) {
        for (const watchItem of watchList) {
          if (!watchItem.operate.stop) {
            const { stop, pause, resume } = watch(...watchItem.setting);
            Object.assign(watchItem.operate, { stop, pause, resume });
          }
        }
      }
    }
  };
  //暂停watch（需要vue3.5+版本）
  pauseWatch = (key) => {
    if (key && this.watchInfoListMap.has(key)) {
      const watchList = this.watchInfoListMap.get(key);
      for (const watchItem of watchList) {
        if (watchItem?.operate?.pause) {
          watchItem.operate.pause();
        }
      }
    } else {
      for (const [key, watchList] of this.watchInfoListMap.entries()) {
        for (const watchItem of watchList) {
          if (watchItem?.operate?.pause) {
            watchItem.operate.pause();
          }
        }
      }
    }
  };
  //恢复watch
  resumeWatch = (key) => {
    if (key && this.watchInfoListMap.has(key)) {
      const watchList = this.watchInfoListMap.get(key);
      for (const watchItem of watchList) {
        if (watchItem?.operate?.resume) {
          watchItem.operate.resume();
        }
      }
    } else {
      for (const [key, watchList] of this.watchInfoListMap.entries()) {
        for (const watchItem of watchList) {
          if (watchItem?.operate?.resume) {
            watchItem.operate.resume();
          }
        }
      }
    }
  };
  //删除watch
  deleteWatch = (key) => {
    if (key && this.watchInfoListMap.has(key)) {
      const watchList = this.watchInfoListMap.get(key);
      for (const watchItem of watchList) {
        if (watchItem?.operate?.stop) {
          watchItem.operate.stop();
        }
      }
      this.watchInfoListMap.delete(key);
    }
  };
  clear = () => {
    for (const watchList of this.watchInfoListMap.values()) {
      for (const watchItem of watchList) {
        if (watchItem?.operate?.stop) {
          watchItem.operate.stop();
        }
      }
    }
    this.watchInfoListMap.clear();
  };
}

//数据处理方法队列，后面的方法的参数是前面方法返回的对象(队列)
export class ProcessFnList {
  constructor(initData, proceessFnList) {
    this.initData = { ...initData };
    this.argsStack = [initData];
    this.proceessFnList = [];
    proceessFnList && this.proceessFnList.push(...proceessFnList);
  }
  addProceess = (proceessFn) => {
    if (getVarType(proceessFn) === 'array') {
      this.proceessFnList.push(...proceessFn);
    } else {
      this.proceessFnList.push(proceessFn);
    }
  };
  getData = () => {
    let data = this.initData;
    this.proceessFnList.map((proceessFn, index) => {
      data = proceessFn(...this.argsStack.slice(0, index + 1));
      this.argsStack.push(JSON.parse(JSON.stringify(data)));
    });
    return data;
  };
}

//运行处理函数管道
export function runProcess(initData, processFnList) {
  let currentData = JSON.parse(JSON.stringify(initData));
  const argsStack = [initData];
  // 遍历执行函数
  processFnList.forEach((fn, index) => {
    const fnArgs = argsStack.slice(0, index + 1);
    currentData = fn(...fnArgs);
    // 将新产生的数据深拷贝后推入栈中，供下一个函数使用
    argsStack.push(JSON.parse(JSON.stringify(currentData)));
  });
  return currentData;
}

//执行方法栈，执行栈内最后一个方法，并且把之前的方法作为该方法的参数传入
export class FunctionStack {
  constructor(sourceParams, fnList) {
    this.fnStack = [];
    this.paramsList = [];
    sourceParams && this.paramsList.push(sourceParams);
    if (fnList) {
      fnList.map((sourceFnItem, index) => {
        const targetFnItem = () => {
          sourceFnItem(...this.paramsList.slice(0, index + 1));
        };
        this.paramsList.push(targetFnItem);
        this.fnStack.push(targetFnItem);
      });
    }
  }
  addFn = (fn) => {
    this.fnStack.push(fn);
  };
  exce() {
    if (this.fnStack.length) {
      this.fnStack[this.fnStack.length - 1](...this.paramsList);
    }
  }
}

//执行方法栈中的最后一个方法，并将之前的参数/方法作为参数传入
export function execLastFunction(fnList, sourceParams) {
  const fnStack = [];
  const paramsList = [];
  if (sourceParams) {
    paramsList.push(sourceParams);
  }
  fnList.forEach((sourceFnItem, index) => {
    const targetFnItem = () => {
      sourceFnItem(...paramsList.slice(0, index + 1));
    };
    paramsList.push(targetFnItem);
    fnStack.push(targetFnItem);
  });
  const lastFn = fnStack[fnStack.length - 1];
  return lastFn(...paramsList);
}

export function getObjectDiffProperty(oldObject, newObject) {
  const needAddPropertyNameList = [];
  const needDeletePropertyNameList = [];
  const noChangePropertyNameList = [];
  const diffInfo = {};

  if (oldObject) {
    for (const readyDeleteKey of Object.keys(oldObject)) {
      diffInfo[readyDeleteKey] = -1;
    }
  }
  if (newObject) {
    for (const readyAddKey of Object.keys(newObject)) {
      if (Reflect.has(diffInfo, readyAddKey)) {
        diffInfo[readyAddKey] = 0;
      } else {
        diffInfo[readyAddKey] = 1;
      }
    }
  }
  for (const key of Object.keys(diffInfo)) {
    if (diffInfo[key] === -1) {
      needDeletePropertyNameList.push(key);
    } else if (diffInfo[key] === 1) {
      needAddPropertyNameList.push(key);
    } else if (diffInfo[key] === 0) {
      noChangePropertyNameList.push(key);
    }
  }
  return {
    addKeyList: needAddPropertyNameList,
    deleteKeyList: needDeletePropertyNameList,
    noChangeKeyList: noChangePropertyNameList,
  };
}

export function objectDiff(oldObject, newObject, diffHandler) {
  const { addKeyList, deleteKeyList, noChangeKeyList } = getObjectDiffProperty(
    oldObject,
    newObject
  );
  for (const addKey of addKeyList) {
    diffHandler('add', addKey, newObject[addKey]);
  }
  for (const deleteKey of deleteKeyList) {
    diffHandler('delete', deleteKey, oldObject[deleteKey]);
  }
  for (const noChangeKey of noChangeKeyList) {
    diffHandler('noChange', noChangeKey, newObject[noChangeKey]);
  }
  return {
    addKeyList,
    deleteKeyList,
    noChangeKeyList,
  };
}

export function arrayDiff(oldArray, newArray, idFieldName, diffHandler) {
  const oldInfo = {},
    newInfo = {};
  if (oldArray) {
    for (const oldItem of oldArray) {
      oldInfo[oldItem[idFieldName]] = oldItem;
    }
  }
  if (newArray) {
    for (const newItem of newArray) {
      newInfo[newItem[idFieldName]] = newItem;
    }
  }
  return objectDiff(oldInfo, newInfo, diffHandler);
}

export function cleanObject(sourceInfo, setter) {
  const targetInfo = {};
  for (const key of Object.keys(sourceInfo)) {
    if (notEmptyValue(sourceInfo[key])) {
      targetInfo[key] = setter ? setter(sourceInfo[key], key) : sourceInfo[key];
    }
  }
  return targetInfo;
}

export const getVarType = (variable) => {
  let typeName;
  const typeofType = (typeof variable).toLowerCase();
  switch (typeofType) {
    case 'number': {
      if (Number.isNaN(variable)) {
        typeName = 'nan';
      } else {
        typeName = 'number';
      }
      break;
    }
    case 'object': {
      if (variable === null) {
        typeName = 'null';
      }
      //以下为js内置对象的判断，可根据需求扩展
      else if (Object.prototype.toString.call(variable).toLowerCase().includes('array]')) {
        typeName = 'array';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('date]')) {
        typeName = 'date';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('regexp]')) {
        typeName = 'regexp';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('file]')) {
        typeName = 'file';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('blob]')) {
        typeName = 'blob';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('filereader]')) {
        typeName = 'fileReader';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('filelist]')) {
        typeName = 'fileList';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('map]')) {
        typeName = 'map';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('set]')) {
        typeName = 'set';
      } else {
        typeName = 'object';
      }
      break;
    }
    case 'function': {
      const functionString = variable.toString();
      //判断是否async函数，第二种条件针对babel（5/6/7）转换后的代码，可能会根据babel版本不同而有变化
      if (
        Object.prototype.toString.call(variable).toLowerCase().includes('asyncfunction') ||
        functionString.includes('return _regenerator.default.async(function')
      ) {
        typeName = 'asyncFunction';
      } else {
        typeName = typeofType;
      }
      break;
    }
    default:
      typeName = typeofType;
  }
  return typeName;
};

export function notEmptyValue(value) {
  return ![undefined, null, ''].includes(value);
}

//遍历树
//nodeHandler签名:({currentNode,parent,index,level,dataFromParentLevel})=>({forChildrenData,stop,filter,doneCallBack})
export const runTreeData = ({
  sourceTree,
  nodeHandler,
  initNodeHandlerData,
  childrenListKey = 'children',
  runCompleteHandler,
}) => {
  const parentKey = Symbol.for('parent');
  const indexKey = Symbol.for('index');
  const levelKey = Symbol.for('level');
  let stopRun;
  const allDoneCallBack = [],
    allstopReturn = [];
  const runTreeDataFunction = (rootData, rootIndex) => {
    const notComplete = [];
    const completed = [];
    const argsMap = new Map();
    notComplete.push(rootData);
    do {
      const currentNode = notComplete.pop();
      if (completed.length && currentNode[parentKey]) {
        if (currentNode[parentKey] !== completed[completed.length - 1][parentKey]) {
          currentNode[indexKey] = 0;
        } else {
          currentNode[indexKey] = completed[completed.length - 1][indexKey] + 1;
        }
      } else {
        currentNode[indexKey] = rootIndex;
      }

      if (!currentNode[parentKey]) {
        currentNode[levelKey] = 1;
      } else {
        currentNode[levelKey] = currentNode[parentKey][levelKey] + 1;
      }

      const handerFunctionReturnList = [];
      let currentRunFunctionArgs;
      if (typeof nodeHandler === 'function') {
        if (currentNode[parentKey]) {
          currentRunFunctionArgs = argsMap.get(currentNode[parentKey])[0];
        } else {
          currentRunFunctionArgs = initNodeHandlerData;
        }
        handerFunctionReturnList.push(
          nodeHandler({
            currentNode,
            parent: currentNode[parentKey],
            index: currentNode[indexKey],
            level: currentNode[levelKey],
            dataFromParentLevel: currentRunFunctionArgs,
          })
        );
      } else if (Array.isArray(nodeHandler)) {
        nodeHandler.map((nodeHandlerItem, index) => {
          if (allstopReturn?.[index] !== true) {
            if (currentNode[parentKey]) {
              currentRunFunctionArgs = argsMap.get(currentNode[parentKey])?.[index];
            } else {
              currentRunFunctionArgs = initNodeHandlerData?.[index];
            }
            handerFunctionReturnList.push(
              nodeHandlerItem({
                currentNode,
                parent: currentNode[parentKey],
                index: currentNode[indexKey],
                level: currentNode[levelKey],
                dataFromParentLevel: currentRunFunctionArgs,
              })
            );
          } else {
            handerFunctionReturnList.push(undefined);
          }
        });
      }
      const forChildrenArgs = [],
        allFilterReturn = [];
      let stop = false,
        filter = false;

      for (const nodeHanderRetrun of handerFunctionReturnList) {
        forChildrenArgs.push(nodeHanderRetrun?.forChildrenData);
        allstopReturn.push(nodeHanderRetrun?.stop);
        allFilterReturn.push(nodeHanderRetrun?.filter);
        if (nodeHanderRetrun?.doneCallBack && typeof nodeHanderRetrun.doneCallBack === 'function') {
          allDoneCallBack.push(nodeHanderRetrun.doneCallBack);
        }
      }
      if (allstopReturn.length && allstopReturn.every((i) => !!i)) {
        stop = true;
      }
      if (allstopReturn.length && allFilterReturn.some((i) => !!i)) {
        filter = true;
      }
      if (!filter) {
        completed.push(currentNode);
      } else {
        if (currentNode[parentKey]) {
          currentNode[parentKey][childrenListKey].splice(currentNode[indexKey], 1);
        }
        const indexInNotComplet = notComplete.findIndex((item) => item === currentNode);
        notComplete.splice(indexInNotComplet, 1);
      }
      if (stop) {
        stopRun = stop;
        break;
      } else if (!filter) {
        if (Array.isArray(currentNode[childrenListKey])) {
          argsMap.set(currentNode, forChildrenArgs);
          for (let i = 0; i < currentNode[childrenListKey].length; i++) {
            currentNode[childrenListKey][i][parentKey] = currentNode;
            notComplete.push(currentNode[childrenListKey][i]);
          }
        }
      }
    } while (notComplete.length);
    for (let i = 0; i < completed.length; i++) {
      if (Reflect.has(completed[i], parentKey)) {
        Reflect.deleteProperty(completed[i], parentKey);
      }
      Reflect.deleteProperty(completed[i], indexKey);
      Reflect.deleteProperty(completed[i], levelKey);
    }
  };
  if (Array.isArray(sourceTree)) {
    for (let i = 0; i < sourceTree.length; i++) {
      runTreeDataFunction(sourceTree[i], i);
      if (stopRun) {
        break;
      }
    }
  } else if (sourceTree) {
    runTreeDataFunction(sourceTree, 0);
  }
  for (const nodeRegisterDoneCallBack of allDoneCallBack) {
    nodeRegisterDoneCallBack();
  }
  typeof runCompleteHandler === 'function' && runCompleteHandler();
};

export function createTree(sourceTree, createNodeFn) {
  const targetTree = [];
  const nodeHandler = ({ currentNode, parent, index, level, dataFromParentLevel }) => {
    const targetNode = createNodeFn({
      sourceNode,
      sourceParent,
      parent: dataFromParentLevel?.parent,
      index,
      level,
    });
    if (!sourceParent) {
      targetTree.push(targetNode);
    } else {
      dataFromParentLevel.parent.children.push(targetNode);
    }
    return {
      forChildrenData: {
        parent: targetNode,
      },
    };
  };
  runTreeData({ sourceTree, nodeHandler });
  return targetTree;
}
