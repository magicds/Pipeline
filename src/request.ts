import {
  //   RequestState,
  //   RequestMessageData,
  //   ResponseMessageData,
  IncomingMessageData,
  MessageRequestOptions,
  //   Store,
} from './type';

class MessageRequest {
  static index: number = 0;
  id: string;
  [propName: string]: any;
  constructor(
    target: WindowProxy,
    data: IncomingMessageData,
    option: MessageRequestOptions
  ) {
    this.target = target;
    this.option = option;

    this.id = `${data.type || ''}_${MessageRequest.index++}`;
    this.data = data;
    this.data.id = this.id;
    this.data.pipeline = data.pipeline;
  }
  send() {
    const isWorker = this.target instanceof window.Worker;
    if (isWorker) {
      if (this.option.transfer) {
        this.target.postMessage(this.data, this.option.transfer);
      } else {
        this.target.postMessage(this.data);
      }
      return;
    }

    if (this.option.transfer) {
      this.target.postMessage(
        this.data,
        this.option.target || '*',
        this.option.transfer
      );
    } else {
      this.target.postMessage(this.data, this.option.target || '*');
    }
  }
  destory() {
    // this
  }
}

export { MessageRequest };

export default MessageRequest;
