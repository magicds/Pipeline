export enum RequestState {
  PEDDING = 'pedding',
  TIMEOUT = 'timout',
  SUCCESS = 'success',
  ERROR = 'error',
}

interface BaseMessageData {
  readonly id: string;
  pipeline: string;
}

export interface RequestMessageData extends BaseMessageData {
  type: string;
  // fun?: string;

  // property?: string;

  [propName: string]: any;
}

export interface ResponseMessageData extends BaseMessageData {
  type: string;
  state: RequestState;
  result?: any;
  error?: any;
}

export interface IncomingMessageData {
  readonly pipeline: string;
  type: string;

  [propName: string]: any;
}

export type MessageRequestOptions = {
  target?: string;
  timeout?: number;
  transfer?: any;
  [propName: string]: any;
};

export type Store = {
  [propName: string]: any;
};
