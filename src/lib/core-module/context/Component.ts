import Property from './Property'
import ComponentLifecycle from './ComponentLifecycle'

export const enum Scope {
  SINGLETON,
  PROTOTYPE
}

class Component {
  private id: string;
  private name: string;
  private classPath: string;
  private scope: Scope;
  private lifecycle : ComponentLifecycle;
  private properties: Property[];

  constructor(id: string, name: string, classPath: string, scope: Scope, lifecycle: ComponentLifecycle) {
    this.id = id;
    this.name = name;
    this.classPath = classPath;
    this.scope = scope;
    this.lifecycle = lifecycle;
  }

  public getId() : string {
    return this.id;
  }

  public setId(id: string) : void {
    this.id = id;
  }

  public getName() : string {
    return this.name;
  }

  public setName(name: string) : void {
    this.name = name;
  }

  public getProperties() : Property[] {
    return this.properties;
  }

  public setProperties(properties: Property[]) : void {
    this.properties = properties;
  }

  public getClassPath() : string {
    return this.classPath;
  }

  public setClassPath(classPath: string) : void {
    this.classPath = classPath;
  }

  public getScope() : Scope {
    return this.scope;
  }

  public setScope(scope: Scope) : void {
    this.scope = scope;
  }

  public getLifecycle() : ComponentLifecycle {
    return this.lifecycle;
  }

  public setLifecycle(lifecycle: ComponentLifecycle) : void {
    this.lifecycle = lifecycle;
  }
}

export default Component;