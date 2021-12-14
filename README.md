# Pipeline

跨域通信的解决方案，基于 `postMessage` 实现，即时是在跨域的情况下，也可方便的跨页面调用方法、获取值、设置值。

## 使用指南

1. 两个页面内均引入 `pipeline.js`。
2. 假设A页面调用B页面方法。则在A页面内:
   ```js
   var pageB_Server = new Pipeline('页面B的window对象');

   // 即可通过 pageB_Server.exec pageB_Server.get pageB_Server.set 跨域调用方法、获取值、修改值等
   ```

详情参考 [./example/index.html](./example/index.html);

需要 Promise 支持，若是IE浏览器需要引入Promise支持。

## Api

注意，基于 `postMessage ` 发送消息再监听拿到结果，因此所有 api 均是异步的，均会返回 Promise .

### exec

调用方法

```js
/**
* 执行一个方法并获取返回结果
* @param {string} fun 要执行的方法名
* @param {Object | Object[]} arg 要传递给待执行方法的参数，多个参数用数组表示。 每个参数必须是可序列化的
* @param {(error, any) => any} callback (可选)执行成功或失败的回调
* @returns {Promise<any>} 含方法调用执行结果的 Promise
*/
exec(fun, arg, callback)
```

示例1: 调用 B 页面的 `obj.print` 方法。

```js
pageB_Server.exec('obj.print', '来自A页面的调用', function (err, result) {
   // err 为调用过程是否出错，如果调用正常则为 null 否则为错误信息
   // result 为实际调用方法的返回值
});

// 更推荐写为 promise 形式
pageB_Server.exec('obj.print', '来自A页面的调用').then(function (result) {
   // 调用结果为 result
}).catch(function (err) {
   // 调用出错
});

// 如果方法需要多个参数，直接以数组形式传递即可
pageB_Server.exec('epoint.alert', ['系统提醒', '请检查内容是否完整']);

// 如果被调用的方法是异步的，且返回值的是 thenable 对象，还可以拿到异步返回结果
pageB_Server.exec('pageInterface.getRemoteData', [{
   date: '2021-06-18'
}]).then(function (data) {
   // 这个 data 就是B页面发请获取到的数据
});
```

### get

获取属性值

```js
/**
 * 获取属性值
 * @param {string} property 属性路径
 * @param {undefined | (error, result)=>{}} callback 回调函数
 * @returns
 */
get(property, callback) 
```

### set

设置属性值

```js
/**
 * 设置属性值
 * @param {string} property 要设置的属性路径， eg: "someObject.someProperty"
 * @param {any} value 要设置的属性的值
 * @param {undefined | (err, any)=> {}} callback 设置成功的回调函数
 * @returns
 */
set(property, value, callback)
```

## 一些限制

上面看起来很美好，似乎除了所有方法都被别变成异步的之外，似乎可以任意调用方法、获取和设置值。

核心限制为： **所有的参数必须是可序列化**

也就是说，参数不能有以下内容：

1. 参数不可以传递 dom 元素， jQuery 对象， 对于我们的 F9 框架来说，传递 miniui 控件实例也是不可以的。
1. 参数不可以是函数， 也就是说不能在跨域调用的情况下给另一个页面的绑定事件，或者给某操作指定回调函数。

## 设计理念

`postMessage` 实际是上提供的消息通信的方案，跨域调用的情况下，A 调用 B ，实际上是需要 A 发送消息给 B ， B 在收到消息验证无误后自己调用后，再将消息回传给 A ，从而完成跨域调用。

整个过程其实非常像客户端发请求，服务端鉴权做出响应。A 作为客户端发起请请求， B 作为服务端提供服务。

因此消息通信的 SDK 采用了如下的类似 HTTP 请求的方案：

当 A 页面调用 B 页面的方法（或获取属性值、设置属性值）时：

1. B 页面相当于是一个 HttpServer , 监听了 `message` 事件， 准备接受请求做出响应。
1. 执行 `var pageB_Server = new Pipeline('页面B的window对象');` 时， 相当于初始化了一个 A - B 的 TCP 连接，此连接持久保持，用于 `A -> B` 的通信。
1. 当 A 页面要调用 B 页面的 `obj.print` 方法时，即执行 `pageB_Server.exec('obj.print', '来自A页面的调用')` 时。
   1. A 页面此时作为客户端，将调用的方法以及相关参数组装成一个 Request ，发送给 B 页面。
   1. B 页面作为一个 “HttpServer” 接收到来自客户端的 Request 后，进行鉴权，通过后根据请求做出响应，此处的要做的处理就是执行自己页面的 `obj.print` ， 参数为 `"来自A页面的调用"`。  并检查返回值
      1. 若返回值为 `thenable` 则等待其 resolve
      1. 若不是 `thenable` 则无需等待
   1. 将上一步的的直接结果，组装成为一个 Response ，将其发送给客户端 A 。
1. 客户端 A 收到 服务端 B 的执行结果响应，跨域调用结束。

图示如下：

<!-- https://app.diagrams.net/#G1UugiIw0zYazt2DT-wA0912B1_BxE0VJg -->

过程中设计如下几个类型：

**RequestState** 用来描述请求状态

```ts
export enum RequestState {
  PEDDING = 'pedding',
  TIMEOUT = 'timout',
  SUCCESS = 'success',
  ERROR = 'error',
}
```

**Request** 用来描述请求

```ts
interface RequestMessageData {
  readonly id: string; // 请求的唯一id， 每个请求会独立生成一个
  pipeline: string; // A-B 连接的id
  type: string; // 跨域调用的类型，分为3种 exec get set
  [propName: string]: any; // 其他参数
}
```

**Response** 用来描述响应

```ts
interface ResponseMessageData {
  readonly id: string; // id 和请求关联，用于内部区分是给哪个请求的回复
  pipeline: string; // 同 Request
  type: string;
  state: RequestState; // 当前状态
  result?: any; // 记录调用结果
  error?: any; // 是否发生错误
}
```

