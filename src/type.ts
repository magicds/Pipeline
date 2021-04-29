export enum RequestState {
  PEDDING = 'pedding',
  TIMEOUT = 'timout',
  SUCCESS = 'success',
  ERROR = 'error',
}

interface BaseMessageData {
  readonly id: string;
  readonly pipelineId: string;
}

export interface RequestMessageData extends BaseMessageData {
  type: string;

  pipeline: true;

  [propName: string]: any;
}

export interface ResponseMessageData extends BaseMessageData {
  type: string;
  state: RequestState;
  result?: any;
  error?: any;
  pipeline: true;
}

export interface IncomingMessageData {
  readonly pipelineId: string;
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
