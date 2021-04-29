import {
  RequestState,
  // RequestMessageData,
  ResponseMessageData,
  IncomingMessageData,
  MessageRequestOptions,
  Store,
} from './type';
import Server from './server';
import MessageRequest from './request';

const handles: any[] = [];
function handleMessageIn(ev: MessageEvent) {
  handles.forEach(handle => {
    handle(ev.data, ev);
  });
}
window.addEventListener('message', function(ev) {
  const data = ev.data;
  console.log(data);
  // if (data && /^epoint/.test(data.type)) {
  if (data && data.pipeline && data.type) {
    handleMessageIn(ev);
  }
});

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

  static defaultOption = {
    target: '*',
    timeout: 1000 * 10,
  };

  static instance: any = {};

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
      if (data.pipelineId === this._id) {
        this._handleResponse(data);
      }
    });
  }

  private sendRequest(data: IncomingMessageData, callback?: () => {}) {
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
      this.store[id].reject = reject;
      this.store[id].resolve = resolve;
    });
  }
  exec(fun: string, arg: any, callback?: () => {}) {
    const data = {
      pipelineId: this._id,
      type: 'exec_request',
      fun,
      arg,
    };
    return this.sendRequest(data, callback);
  }

  get(property: string, callback?: () => {}) {
    const data = { pipelineId: this._id, type: 'get', property };
    return this.sendRequest(data, callback);
  }

  set(property: string, value: any, callback?: () => {}) {
    const data = {
      pipelineId: this._id,
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
