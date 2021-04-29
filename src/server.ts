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

class Server {
  isListening: boolean;

  constructor(handles: any[]) {
    this.isListening = true;
    handles.push((data: RequestMessageData, ev: MessageEvent) => {
      if (!this.isListening) {
        return;
      }

      // 执行的请求
      this.handle(data, ev);
    });
  }

  private handle(data: RequestMessageData, ev: MessageEvent) {
    if (data.type === 'exec_request') {
      this.handleExec(data, ev);
      return;
    }
  }

  private handleExec(data: RequestMessageData, ev: MessageEvent) {
    const { fun, id, pipelineId } = data;
    let arg: any | any[] = data.arg;

    const responseData: ResponseMessageData = {
      id,
      pipelineId,
      state: RequestState.PEDDING,
      type: 'exec_response',
      pipeline: true,
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

  private _reply(messageEvent: MessageEvent, data: ResponseMessageData) {
    // https://stackoverflow.com/questions/53064444/typescript-complains-when-i-try-to-postmessage-back-to-source
    // if (
    //   messageEvent.source &&
    //   !(messageEvent.source instanceof MessagePort) &&
    //   !(messageEvent.source instanceof ServiceWorker)
    // )
    const source = messageEvent.source as WindowProxy;
    if (source && typeof source.postMessage === 'function') {
      // todo DOMException 异常
      source.postMessage(data, messageEvent.origin);
    }
  }
}

export default Server;
export { Server };
