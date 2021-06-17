# Pipeline

跨域通信的解决方案，基于 `postMessage` 实现，可方便的跨页面调用方法、获取值、设置值。

## 使用指南

1. 两个页面内均引入 `pipeline.js`。
2. 假设A页面调用B页面方法。则在A页面内:
   ```js
   var pageB_Server = new Pipeline('页面B的window对象');

   // 即可通过 pageB_Server.exec pageB_Server.get pageB_Server.set 跨域调用方法、获取值、修改值等
   ```

详情参考 [./example/index.html](./example/index.html);

## Api

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

### get

获取属性值


### set

设置属性值


## 设计理念
