// import { camelCase, upperFirst } from "lodash-es"
var _ = require('lodash');

module.exports = class Handler {
  constructor({ types, template }, options, extraData) {
    this.types = types;
    this.template = template;

    this.options = options || {};
    this.storeNameMap = this.options.storeNameMap || {};

    this.importStoreMap = {};
    this.computedStoreMap = {}
    this.computedStateNodes = [];

    this.deleteNodePaths = [];

    this.filePath = extraData ? extraData.filePath : "";

    this.modified = false;
  }

  signModified() {
    this.modified = true;
  }

  addImportStore(name, path) {
    if (!this.options.autoImport) {
      this.importStoreMap[name] = path;
    }
  }

  addComputedStore(name) {
    this.computedStoreMap[name] = true;
  }

  addComputedState(node) {
    this.computedStateNodes.push(node);
  }

  addDeleteNodePath(nodePath) {
    this.deleteNodePaths.push(nodePath);
  }

  getStoreInfoByVariables(variables) {
    const variablesLen = variables.length;
    if (variablesLen === 0) {
      return null;
    }
    let storeName = '';
    let parts = [];
    let path = '';
    for (let i = variablesLen; i > 0; i--) {
      parts = variables.slice(0, i);
      path = parts.join("/");
      const name = _.camelCase(path);
      if (this.storeNameMap[name]) {
        storeName = name;
        break;
      }
    }
    if (!storeName) {
      storeName = variables[0];
      parts = [storeName];
      path = storeName;
    }
    const dotName = parts.join(".");
    return {
      isOnlyStore: parts.length === variablesLen,
      parts,
      name: storeName,
      path: parts.join("/"),
      dotName,
      dotNameFull: variables.join(".").replace(`${dotName}`, storeName)
    }
  }

  getStoreInfoByNode(containerPath, rootVariable) {
    const variables = [];
    containerPath.traverse({
      MemberExpression: (path) => {
        const currentNode = path.node;
        if (currentNode.object.name === rootVariable) {
          let currentPath = path;
          while (this.types.isMemberExpression(currentPath.node)) {
            variables.push(currentPath.get("property").node.name);
            currentPath = currentPath.parentPath;
          }
          path.stop();
        }
      }
    })
    return this.getStoreInfoByVariables(variables);
  }

  useTemplate(type, info) {
    switch (type) {
      case 0:
        return `
          mapState(use${_.upperFirst(info.storeName)}Store, {
            ${info.key}(store){
              const method = ${info.methodSource};
              return method(store);
            }
          })
        `;
      case 1:
        return `
          mapState(use${_.upperFirst(info.storeName)}Store, {
            ${info.methodSource}
          })
        `;
      case 2:
        return `
          mapState(use${_.upperFirst(info.storeName)}Store, {
            ${info.key}(store){
              return store${info.property}
            }
          })
       `;
      case 3:
        return `
          this.${info.storeName}Store.${info.methodName}
        `;
      case 4:
        const storeNames = info.storeNames;
        const argStr = storeNames.map((name) => {
          return `use${_.upperFirst(name)}Store`;
        }).join(",");
        return `mapStores(${argStr})`;
    }
  }
  handleBindingHelper(path) {
    const node = path.node;
    if (!/mapState|mapGetters/.test(node.callee.name)) {
      return false
    }
    if (/^use/.test(node.arguments[0].name)) { // 防止pinia的mapState也被处理了
      return false;
    }
    const types = this.types;
    const template = this.template;


    const firstArgPath = path.get("arguments.0"); // 帮助方法的的第一个参数的path
    const firstArgPathNode = firstArgPath.node;

    if (types.isObjectExpression(firstArgPathNode)) { // 是对象。好像只存在于mapState
      firstArgPathNode.properties.forEach((propertyNode, index) => {
        const computedItemName = propertyNode.key.name; // vue中计算属性的名称
        const propertyPath = firstArgPath.get(`properties.${index}`);

        if (propertyNode.type !== "ObjectProperty" && propertyNode.type !== "ObjectMethod") {
          return;
        }
        const isObjectProperty = propertyNode.type === "ObjectProperty";
        const methodPath = isObjectProperty ? propertyPath.get("value") : propertyPath;
        const templateType = isObjectProperty ? 0 : 1;

        const rootVariable = methodPath.node.params[0].name;
        const storeNameInfo = this.getStoreInfoByNode(methodPath, rootVariable);

        const templateStr = this.useTemplate(templateType, {
          key: computedItemName,
          storeName: storeNameInfo.name,
          methodSource: methodPath.getSource().replaceAll(`${rootVariable}.${storeNameInfo.dotName}`, rootVariable).replaceAll(rootVariable, "store")
        });
        const ast = template.expression.ast(templateStr);
        const mapStateItemNode = types.spreadElement(ast);

        this.addComputedState(mapStateItemNode);

        this.addImportStore(storeNameInfo.name, storeNameInfo.path);
      });


      if (types.isSpreadElement(path.parent)) {
        this.addDeleteNodePath(path.parentPath);
      }

    } else if (types.isArrayExpression(firstArgPathNode)) { // 是数组
      const node = path.node;
      node.callee.name = "mapStores";

      const elements = node.arguments[0].elements;

      elements.forEach((element) => {
        this.addComputedStore(element.value);
      });

      if (types.isSpreadElement(path.parent)) {
        this.addDeleteNodePath(path.parentPath);
      }

    } else if (types.isStringLiteral(firstArgPathNode)) { // 是字符串
      const secondArgPath = path.get("arguments.1");
      const secondArgNode = secondArgPath.node;
      if (types.isObjectExpression(secondArgNode) || types.isArrayExpression(secondArgNode)) {
        let secondArgObj = eval(`(${secondArgPath.getSource()})`);
        if (Array.isArray(secondArgObj)) {
          secondArgObj = secondArgObj.reduce((obj, current) => {
            obj[current] = current;
            return obj;
          }, {})
        }
        Object.keys(secondArgObj).forEach((key) => {
          const property = secondArgObj[key];
          const dotName = `${firstArgPathNode.value.replaceAll("/", ".")}.${property}`;
          const variables = dotName.split(".");
          const storeNameInfo = this.getStoreInfoByVariables(variables);

          const templateStr = this.useTemplate(2, {
            key: key,
            storeName: storeNameInfo.name,
            property: dotName.replace(storeNameInfo.dotName, "")
          });

          const ast = template.expression.ast(templateStr);
          const mapStateItemNode = types.spreadElement(ast);

          this.addComputedState(mapStateItemNode);
          this.addImportStore(storeNameInfo.name, storeNameInfo.path);
        });

        if (types.isSpreadElement(path.parent)) {
          this.addDeleteNodePath(path.parentPath);
        }
      }
    }
    return true;
  }

  handleStoreCall(path) {
    const node = path.node;
    ;
    if (!/dispatch|commit/.test(_.get(node, "callee.property.name"))) {
      return false;
    }

    if (_.get(node, "callee.object.property.name") !== "$store") {
      return false;
    }
    const types = this.types;
    const template = this.template;

    const firstArgNode = node.arguments[0] || "";
    const execResult = /^(.+)\/(.+?)$/.exec(firstArgNode.value);
    if (!execResult) {
      console.warn(`${this.filePath}\n 注意这个$store的调用处理不了 ${firstArgNode.value}`)
      return;
    }
    const storePath = execResult[1];
    const storeName = _.camelCase(storePath);
    const methodName = execResult[2];

    const templateStr = this.useTemplate(3, { storeName, methodName });
    const calleeNode = template.expression.ast(templateStr);
    const expressionNode = types.callExpression(calleeNode, node.arguments.slice(1));

    path.replaceWith(expressionNode);
    this.addImportStore(storeName, storePath);
    this.addComputedStore(storeName);
    this.signModified();

    return true;
  }

  create() {
    const types = this.types;
    const template = this.template;

    return {
      post: (file) => {
        const options = this.options;
        const importStoreMap = this.importStoreMap;
        const storeNames = Object.keys(importStoreMap);
        if (storeNames.length > 0 && !options.autoImport) {
          storeNames.forEach((name) => {
            const ast = template.statement.ast(`import { use${_.upperFirst(name)}Store } from "~/stores/${importStoreMap[name]}"`);
            file.path.unshiftContainer("body", ast);
          });
          this.signModified();
        }


        const computedStoreMap = this.computedStoreMap;
        const computedStoreNames = Object.keys(computedStoreMap);
        const hasComputedStore = computedStoreNames.length > 0;
        const hasComputedState = this.computedStateNodes.length > 0;

        if (hasComputedStore || hasComputedState) {
          /**
        * 如果computed不存在，则创建
        */
          const programNode = file.path.node;
          const exportItemIndex = programNode.body.findIndex((node) => {
            return types.isExportDefaultDeclaration(node);
          });

          const exportItem = programNode.body[exportItemIndex];
          const properties = exportItem.declaration.properties
          let computedIndex = properties.findIndex((property) => {
            return _.get(property, "key.name") === "computed";
          });

          let declarationPath = file.path.get(`body.${exportItemIndex}.declaration`);
          if (computedIndex === -1) {
            computedIndex = properties.length;
            const node = types.ObjectProperty(types.identifier("computed"), template.expression.ast(`{}`));

            declarationPath.pushContainer("properties", node);
            this.signModified();
          }
          const computedValuePath = declarationPath.get(`properties.${computedIndex}.value`);

          /** 处理store */
          if (hasComputedStore) {
            if (!options.autoImport) {
              file.path.unshiftContainer("body", template.statement.ast(`import { mapStores } from "pinia"`));
            }
            const templateStr = this.useTemplate(4, { storeNames: computedStoreNames });
            const ast2 = template.expression.ast(templateStr);
            const spreadNode = types.spreadElement(ast2);
            computedValuePath.unshiftContainer("properties", spreadNode);
            this.signModified();
          }

          /** 处理state */
          if (hasComputedState) {
            if (!options.autoImport) {
              file.path.unshiftContainer("body", template.statement.ast(`import { mapState } from "pinia"`));
            }

            this.computedStateNodes.forEach((node, index) => {
              computedValuePath.unshiftContainer("properties", node);
            });
            this.signModified();
          }

        }

        if (this.deleteNodePaths.length > 0) {
          this.deleteNodePaths.forEach((nodePath) => {
            try {
              nodePath.remove();
            } catch (error) {
              // console.error(error);
            }
          });
          this.signModified();
        }

      },
      visitor: {
        /**
         * 移除 import { mapState, mapGetters } from "vuex"
         */
        ImportDeclaration: (path) => {
          const node = path.node;
          if (node.source.value == "vuex") {
            this.addDeleteNodePath(path);
          }
        },
        CallExpression: (path) => {
          if (this.handleBindingHelper(path) || this.handleStoreCall(path)) {
            return;
          }
        },
        MemberExpression: (path) => {
          const node = path.node;
          if (node.property.name !== "$store" || _.get(path, "parent.property.name") !== "state") {
            return;
          }
          if (!node.object || !types.isThisExpression(node.object)) {
            return;
          }

          const variables = [];

          let currentPath = path.parentPath; // 对应是state的
          while (types.isMemberExpression(currentPath.parent)) {
            currentPath = currentPath.parentPath;
            const name = currentPath.node.property.name;
            if (name) {
              variables.push(name);
            }
          }

          const isCallee = (currentPath.node === currentPath.parent.callee);
          const destPath = isCallee ? currentPath.get("object") : currentPath;
          isCallee && variables.pop();

          const storeNameInfo = this.getStoreInfoByVariables(variables);
          const templateStr = `this.$pinia.state.value.${storeNameInfo.dotNameFull}`

          destPath.replaceWithSourceString(templateStr);
          this.signModified();

          this.addImportStore(storeNameInfo.name, storeNameInfo.path);
          this.addComputedStore(storeNameInfo.name);
        }
      }
    }
  }
}
