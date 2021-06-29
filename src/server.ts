import {
  RequestState,
  RequestMessageData,
  ResponseMessageData,
  //   IncomingMessageData,
  //   MessageRequestOptions,
  //   Store,
} from './type';

const isArray = (obj: any): boolean => {
  return '[object Array]' === Object.prototype.toString.call(obj);
};

/*eslint no-new-func: "off"*/
class Server {
  handle(data: RequestMessageData, ev: MessageEvent) {
    if (data.type === 'exec_request') {
      this.handleExec(data, ev);
      return;
    }

    if (data.type === 'get_request') {
      this.handleGet(data, ev);
      return;
    }
    if (data.type === 'set_request') {
      this.handleSet(data, ev);
      return;
    }
  }

  private handleExec(data: RequestMessageData, ev: MessageEvent) {
    const { fun, id, pipeline } = data;
    let arg: any | any[] = data.arg;

    const responseData: ResponseMessageData = {
      id,
      pipeline,
      state: RequestState.PEDDING,
      type: 'exec_response',
    };

    let ret;

    if (!isArray(arg)) {
      arg = [arg];
    }

    // 调用函数得到结果
    try {
      // const funWrapper = new Function('param', `return ${fun}(param)`);
      // ret = funWrapper(arg);
      const argList = [];
      for (let i = 0; i < arg.length; i++) {
        argList.push('a' + i);
      }
      //   const args = [null].concat(
      //     argList.concat(`return ${fun}(${argList.join(', ')})`)
      //   );
      //   const funWrapper = new (Function.prototype.bind.apply(Function, args))();

      const funWrapper = new Function(
        ...argList,
        `return ${fun}(${argList.join(', ')})`
      );
      ret = funWrapper.apply(null, arg);

      // 如果结果是 promise 则
      if (ret && typeof ret.then === 'function') {
        ret.then(
          (res: any) => {
            responseData.state = RequestState.SUCCESS;
            responseData.result = res;
            this._reply(ev, responseData);
          },
          (err: any) => {
            responseData.state = RequestState.ERROR;
            responseData.result = err;
            this._reply(ev, responseData);
          }
        );
        return;
      }
      responseData.state = RequestState.SUCCESS;
    } catch (error) {
      console.error(error);
      responseData.state = RequestState.ERROR;
      ret = error;
    }

    if (responseData.state === RequestState.SUCCESS) {
      responseData.result = ret;
    } else {
      responseData.error = ret;
    }

    this._reply(ev, responseData);
  }

  private handleGet(data: RequestMessageData, ev: MessageEvent) {
    const { property, id, pipeline } = data;

    const responseData: ResponseMessageData = {
      id,
      pipeline,
      state: RequestState.PEDDING,
      type: 'get_response',
    };

    let ret;

    try {
      // eslint-no-new-func: off
      ret = new Function(`return ${property}`)();
      responseData.result = ret;
      responseData.state = RequestState.SUCCESS;
    } catch (error) {
      console.error(error);
      responseData.state = RequestState.ERROR;
      ret = error;
    }

    if (responseData.state === RequestState.SUCCESS) {
      responseData.result = ret;
    } else {
      responseData.error = ret;
    }

    this._reply(ev, responseData);
  }

  private handleSet(data: RequestMessageData, ev: MessageEvent) {
    const { property, value, id, pipeline } = data;

    const responseData: ResponseMessageData = {
      id,
      pipeline,
      state: RequestState.PEDDING,
      type: 'set_response',
    };

    let ret;

    try {
      // 包含 .  则是对象属性设置
      if (/\./.test(property)) {
        const pos = property.lastIndexOf('.');
        const parentKey = property.substring(0, pos);
        const realKey = property.substr(pos + 1);
        // eslint-no-new-func: off
        const parentObj = new Function(`return ${parentKey}`)();
        parentObj[realKey] = value;
      } else {
        // 否则是为全局对象
        window[property] = value;
      }

      // 无错误即视为成功
      ret = true;
      responseData.result = true;
      responseData.state = RequestState.SUCCESS;
    } catch (error) {
      console.error(error);
      responseData.state = RequestState.ERROR;
      ret = error;
    }

    if (responseData.state === RequestState.SUCCESS) {
      responseData.result = ret;
    } else {
      responseData.error = ret;
    }

    this._reply(ev, responseData);
  }

  private _reply(messageEvent: MessageEvent, data: ResponseMessageData) {
    // https://stackoverflow.com/questions/53064444/typescript-complains-when-i-try-to-postmessage-back-to-source
    // if (
    //   messageEvent.source &&
    //   !(messageEvent.source instanceof MessagePort) &&
    //   !(messageEvent.source instanceof ServiceWorker)
    // )
    // todo worker 处理

    const isWorker = messageEvent.source === null;
    let source = messageEvent.source as WindowProxy;
    // let source = messageEvent.source;

    // 常规window

    // todo DOMException 异常
    try {
      if (isWorker) {
        // eslint-disable-next-line
        (self as any).postMessage(data);
      } else {
        source.postMessage(data, messageEvent.origin);
      }
    } catch (error) {
      console.error('调用已成功，但结果无法被传输');
      debugger;
    }
    return;

    // if (source && typeof source.postMessage === 'function') {
    //   // todo DOMException 异常
    //   try {
    //     source.postMessage(data, messageEvent.origin);
    //   } catch (error) {
    //     console.error('调用已成功，但结果无法被传输');
    //     debugger;
    //   }
    // }
  }
}

export default Server;
export { Server };
