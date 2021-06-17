import {
  RequestState,
  ResponseMessageData,
  IncomingMessageData,
  MessageRequestOptions,
  Store,
} from './type';
import Server from './server';
import MessageRequest from './request';

const handles: any[] = [];
function handleMessageIn(ev: MessageEvent) {
  // 针对服务来源进行校验 return false 则不提供服务
  if (
    typeof Pipeline.validate === 'function' &&
    /request$/.test(ev.data.type) &&
    !Pipeline.validate(ev)
  ) {
    return;
  }
  handles.forEach(handle => {
    handle(ev.data, ev);
  });
}

function listen(ev: MessageEvent) {
  const data = ev.data;
  // if (data && /^epoint/.test(data.type)) {
  if (data && data.pipeline && data.type) {
    // log(data);
    handleMessageIn(ev);
  }
}
// eslint-disable-next-line
(self || window).addEventListener('message', listen);

new Server(handles);

const hasKey = (obj: Object, key: string | number): boolean => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

let index = 0;

class Pipeline {
  target: WindowProxy = window;
  _id: string = '1';
  store: Store = {};
  option: MessageRequestOptions = Pipeline.defaultOption;
  debug: boolean = false;

  static validate: null | Function = null;

  static defaultOption = {
    target: '*',
    timeout: 1000 * 10,
  };

  static instance: any = {};

  static initWorkerListen(worker: Worker) {
    worker.addEventListener('message', listen);
  }

  constructor(target: WindowProxy, option: MessageRequestOptions = {}) {
    // 单例 避免对一个对象多次创建
    const instance = Pipeline.getInstance(target);
    if (instance !== false) {
      return instance;
    }

    const id = '' + ++index;
    this._id = id;
    Pipeline.instance[id] = this;

    this.target = target;
    this.option = Object.assign({}, Pipeline.defaultOption, option);
    this.store = {};
    this.initListener();
  }

  static getInstance(target: WindowProxy): false | Pipeline {
    for (let key in Pipeline.instance) {
      if (hasKey(Pipeline.instance, key) && Pipeline.instance[key] === target) {
        return Pipeline.instance[key];
      }
    }
    return false;
  }

  initListener() {
    handles.push((data: ResponseMessageData) => {
      if (data.pipeline === this._id) {
        this._handleResponse(data);
      }
    });
  }

  private sendRequest(
    data: IncomingMessageData,
    callback?: () => {}
  ): Promise<any> {
    const request = new MessageRequest(this.target, data, this.option);
    const id = request.id;
    this.store[id] = {};

    if (typeof callback === 'function') {
      this.store[id].callback = callback;
    }

    return new Promise((resolve, reject) => {
      // 发送请求
      // todo DOMException 异常
      request.send();
      // 记录
      // this.store[id].data = { request: request.data };
      this.store[id].reject = reject;
      this.store[id].resolve = resolve;

      if (this.debug) {
        // console.log(this.store[id].data);
        log(request.data);
      }
    });
  }
  /**
   * 执行一个方法并获取返回结果
   * @param {string} fun 要执行的方法名
   * @param {Object | Object[]} arg 要传递给待执行方法的参数，多个参数用数组表示。 每个参数必须是可序列化的
   * @param {(error, any) => any} callback (可选)执行成功或失败的回调
   * @returns {Promise<any>} 含方法调用执行结果的 Promise
   */
  exec(fun: string, arg: Object | Object[], callback?: () => {}) {
    const data = {
      pipeline: this._id,
      type: 'exec_request',
      fun,
      arg,
    };
    return this.sendRequest(data, callback);
  }
  /**
   * 获取属性值
   * @param {string} property 属性路径
   * @param {undefined | (error, result)=>{}} callback 回调函数
   * @returns 
   */
  get(property: string, callback?: () => {}) {
    const data = { pipeline: this._id, type: 'get_request', property };
    return this.sendRequest(data, callback);
  }

  set(property: string, value: any, callback?: () => {}) {
    const data = {
      pipeline: this._id,
      type: 'set_request',
      property,
      value,
    };
    return this.sendRequest(data, callback);
  }

  /**
   * 执行结果返回
   * @param data
   */
  _handleResponse(data: ResponseMessageData) {
    const { id, result, state, error } = data;

    let item = this.store[id];
    // item.data.response = data;
    if (this.debug) {
      // console.log(this.store[id].data);
      log(data);
    }
    try {
      if (item.callback) {
        if (state === RequestState.SUCCESS) {
          item.callback(null, result);
        } else {
          item.callback(error);
        }
      }

      if (state === RequestState.SUCCESS) {
        item.resolve(result);
      } else {
        item.reject(error);
      }
    } catch (error) {
      item.reject(error);
    }

    item = null;
    delete this.store[id];
  }
}

export default Pipeline;
// export { Pipeline };

const typeStyle: any = {
  exec_request: 'background:#3472d7;color:#fff;border-radius:2px',
  exec_response: 'background:#5d8edf;color:#fff;border-radius:2px',

  get_request: 'background:#3cb657;color:#fff;border-radius:2px',
  get_response: 'background:#63c579;color:#fff;border-radius:2px',

  set_request: 'background:#fb9227;color:#fff;border-radius:2px',
  set_response: 'background:#ff7471;color:#fff;border-radius:2px',
};
function log(data: any) {
  let arg;
  switch (data.type) {
    case 'exec_request':
      arg = data.fun;
      break;
    case 'exec_response':
      arg = data.result;
      break;
    case 'set_request':
    case 'get_request':
      arg = data.property;
      break;
    case 'get_response':
    case 'set_response':
      arg = data.result;
      break;

    default:
      break;
  }
  if (/response$/.test(data.type)) {
    console.log(
      `%c Pipeline %c ${data.type} %c ${data.state} %c %o`,
      'background:#00bcd4; color:#fff; border-radius: 2px; margin-right: 4px;',
      typeStyle[data.type],
      'color:#fff; margin: 2px;' +
        (data.state === 'success'
          ? 'background:#3cb657;'
          : 'background:#ff514e;'),
      'color:#333;',
      arg,
      data
    );
  } else {
    console.log(
      `%c Pipeline %c ${data.type} %c %o`,
      'background:#00bcd4; color:#fff; border-radius: 2px; margin-right: 4px;',

      typeStyle[data.type],
      'color:#333;',
      arg,
      data
    );
  }
}
