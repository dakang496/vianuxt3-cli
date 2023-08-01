const _ = require("lodash");

module.exports = class Handler {
  constructor({ types, template }, options) {
    this.types = types;
    this.template = template;

    this.options = options || {};
    this.storeId = this.options.storeId || "";

    this.actionNodes = [];
    this.getterNodes = [];
    this.stateNode = null;
  }

  handleState(path, declarationPath) {
    const types = this.types;
    const template = this.template;
    const stateSource = path.get("init").getSource();

    this.stateNode = types.ObjectProperty(types.identifier("state"), template.expression.ast(stateSource));
    declarationPath.remove();
  }

  handleMutations(path, declarationPath) {
    const properties = path.get("init").node.properties;

    const nodes = properties.map((property, index) => {
      const propertyPath = path.get(`init.properties.${index}`);
      const stateName = property.params[0].name;

      propertyPath.scope.rename(stateName, "this");
      property.params = property.params.slice(1);

      return property;
    });

    this.actionNodes = this.actionNodes.concat(nodes);
    declarationPath.remove();
  }

  createNuxtAppNode() {
    return this.types.callExpression(this.types.Identifier("useNuxtApp"), []);
  }

  handleActions(path, declarationPath) {
    const properties = path.get("init").node.properties;
    const nodes = properties.map((property, index) => {
      const propertyPath = path.get(`init.properties.${index}`);

      property.params = property.params.slice(1);

      propertyPath.traverse({
        ThisExpression: (path) => {
          path.replaceWith(this.createNuxtAppNode());
        },
      });

      propertyPath.scope.rename("commit", "this.commit");

      return property;
    });

    this.actionNodes = this.actionNodes.concat(nodes);

    declarationPath.remove();
  }

  handleGetters(path, declarationPath) {
    const properties = path.get("init").node.properties;
    const nodes = properties.map((property, index) => {
      const propertyPath = path.get(`init.properties.${index}`);
      const stateName = property.params[0].name;

      propertyPath.scope.rename(stateName, "this");
      property.params = property.params.slice(1);

      return property;
    });

    this.getterNodes = this.getterNodes.concat(nodes);

    declarationPath.remove();
  }

  create() {
    return {
      post: (file) => {
        const types = this.types;
        const template = this.template;
        const path = file.path;

        file.path.pushContainer("body", this.template.ast(`export const use${_.upperFirst(_.camelCase(this.storeId))}Store = defineStore("${this.storeId}",{})`));

        const length = path.node.body.length;
        const objectPath = file.path.get(`body.${length - 1}.declaration.declarations.0.init.arguments.1`);

        /** 添加state */
        objectPath.pushContainer("properties", this.stateNode);

        /** 添加getter */
        const hasGetter = this.getterNodes.length > 0;

        if (hasGetter) {
          const gettersNode = types.ObjectProperty(types.identifier("getters"), template.expression.ast("{}"));

          objectPath.pushContainer("properties", gettersNode);

          const index = objectPath.node.properties.length - 1;

          this.getterNodes.forEach(node => {
            objectPath.get(`properties.${index}.value`).pushContainer("properties", node);
          });
        }

        /** 添加action */
        const hasAction = this.actionNodes.length > 0;

        if (hasAction) {
          const actionsNode = types.ObjectProperty(types.identifier("actions"), template.expression.ast(`{
            commit(method,...args){
              this[method].apply(this,args);
            }
          }`));

          objectPath.pushContainer("properties", actionsNode);

          const index = objectPath.node.properties.length - 1;

          this.actionNodes.forEach(node => {
            objectPath.get(`properties.${index}.value`).pushContainer("properties", node);
          });
        }
      },
      visitor: {
        ExportNamedDeclaration: (path) => {
          const variableDeclaratorPath = path.get("declaration.declarations.0");
          const variableName = variableDeclaratorPath.node.id.name;

          switch (variableName) {
          case "state":
            this.handleState(variableDeclaratorPath, path);
            break;
          case "mutations":
            this.handleMutations(variableDeclaratorPath, path);
            break;
          case "actions":
            this.handleActions(variableDeclaratorPath, path);
            break;
          case "getters":
            this.handleGetters(variableDeclaratorPath, path);
            break;
          }
        },
      },

    };
  }
};
