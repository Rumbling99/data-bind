try {
    Object.defineProperty({}, 0, {
        enumerable: true,
        configurable: true
    });
} catch (e) {
    throw new Error("your browser is not supported by 'databind', please use IE9+, Chrome or Firefox");
}

var Entity = function() {
    // Helpers
    // -------

    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var extendProps = function(protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && protoProps != null && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function(){ return parent.apply(this, arguments); };
        }

        // Add static properties to the constructor function, if supplied.
        extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function(){ this.constructor = child; };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) extend(child.prototype, protoProps);

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        return child;
    };

    var eventManager = function() {
        var eventManager = {};
        var objects = {};
        eventManager.attach = function(objectName, event, handler) {
            if (!objects.hasOwnProperty(objectName)) {
                objects[objectName] = {};
            }
            if (!objects[objectName].hasOwnProperty(event)) {
                objects[objectName][event] = [];
            }
            objects[objectName][event].push(handler);
        };
        eventManager.trigger = function(objectName, event) {
            if (!objects.hasOwnProperty(objectName)) {
                return;
            }
            if (!objects[objectName].hasOwnProperty(event)) {
                return;
            }
            var handlers = objects[objectName][event];
            for (var i = 0, length = handlers.length; i < length; i++) {
                handlers[i].call();
            }
        };
        eventManager.detachAll = function(objectName) {
            objects[objectName] = {};
        };
        return eventManager;
    }();

    var bindEvent = function(element, event, handler) {
        if (element.addEventListener) {
            element.addEventListener(event, handler, false);
        } else {
            element.attachEvent('on' + event, handler);
        }
    };

    var extend = function(target) {
        if (!!target && typeof target !== 'object') {
            return target;
        }
        var source, key;
        for (var i = 1, length = arguments.length; i < length; i++) {
            source = arguments[i];
            for (key in source) {
                target[key] = source[key];
            }
        }
        return target;
    };

    var idCounter = 0;
    var uid = function() {
        var id = ++idCounter + '';
        return Math.random().toString().substring(2, 17) + '_' + id;
    };
    // -------
    // Helpers end

    /**
     * two-way bind on elements that has same bindName([data-bind='bindName'])
     * group elements by tagName, type, name and then pass them to bindGroup()
     */
    var bindByKey = function(strategy, proxy, key, elements, objectNamePrefix) {
        eventManager.detachAll(objectNamePrefix + key);
        var groupMap = {};
        for (var i = 0, length = elements.length; i < length; i++) {
            var element = elements[i];
            var tagName = element.tagName;
            var type = element.type || '';
            var name = element.name || '';
            var groupKey = tagName + '_' + type + '_' + name;
            if (!groupMap.hasOwnProperty(groupKey)) {
                groupMap[groupKey] = [];
            }
            groupMap[groupKey].push(element);
        }
        for (var groupKey in groupMap) {
            if (!groupMap.hasOwnProperty(groupKey)) {
                continue;
            }
            bindGroup(strategy, proxy, key, groupMap[groupKey], objectNamePrefix);
        }
    };

    /**
     * two-way bind on non-group elements(input-text, textarea, select ...) 
     * or on a group of elements that has same name(input-radio ...)
     */
    var bindGroup = function(strategy, proxy, key, elements, objectNamePrefix) {
        var boardcastBinded = false;
        var bindStrategy = strategy;
        for (var i = 0, elementLength = elements.length; i < elementLength; i++) {
            (function(element) {
                var tagName = element.tagName.toLowerCase();
                var type = element.type;
                if (bindStrategy.hasOwnProperty(tagName)) {
                    if (bindStrategy[tagName].boardcast) {
                        if (bindStrategy[tagName].report) {
                            for (var j = 0; j < bindStrategy[tagName].event.length; j++) {
                                bindEvent(element, bindStrategy[tagName].event[j], function() {
                                    bindStrategy[tagName].report.call(element, proxy, key, elements);
                                });
                            }
                        }
                        /**
                         * if share boardcast, bind boardcast on entity only once
                         */
                        if (bindStrategy[tagName].shareBoardcast && boardcastBinded) {
                            return;
                        }
                        eventManager.attach(objectNamePrefix + key, 'change', function() {
                            bindStrategy[tagName].boardcast.call(element, proxy, key, elements);
                        });
                        boardcastBinded = true;
                    } else {
                        if (bindStrategy[tagName].hasOwnProperty(type)) {
                            if (bindStrategy[tagName][type].report) {
                                for (var j = 0; j < bindStrategy[tagName][type].event.length; j++) {
                                    bindEvent(element, bindStrategy[tagName][type].event[j], function() {
                                        bindStrategy[tagName][type].report.call(element, proxy, key, elements);
                                    });
                                }
                            }
                            if (bindStrategy[tagName][type].shareBoardcast && boardcastBinded) {
                                return;
                            }
                            eventManager.attach(objectNamePrefix + key, 'change', function() {
                                bindStrategy[tagName][type].boardcast.call(element, proxy, key, elements);
                            });
                            boardcastBinded = true;
                        } else {
                            throw new Error("data bind on input-" + element.type + " is not supported");
                        }
                    }
                } else {
                    throw new Error("data bind on " + element.tagName + " is not supported");
                }
            })(elements[i]);
        }
    };

    var bindStrategy = {
        'textarea': {
            event: ['input'],
            report: function(proxy, key) {
                if (this.value === 0 || this.value === '') {
                    if (proxy[key] === this.value) {
                        return;
                    }
                } else if (proxy[key] == this.value) {
                    return;
                }
                proxy[key] = this.value;
            },
            boardcast: function(proxy, key) {
                if (proxy[key] === null) {
                    this.value = "";
                    return;
                }
                if (proxy[key] === 0 || proxy[key] === '') {
                    if (proxy[key] === this.value) {
                        return;
                    }
                } else if (proxy[key] == this.value) {
                    return;
                }
                this.value = proxy[key];
            }
        },
        'select': {
            event: ['change'],
            report: function(proxy, key) {
                if (proxy[key] == this.value) {
                    return;
                }
                proxy[key] = this.value;
            },
            boardcast: function(proxy, key) {
                if (proxy[key] == this.value) {
                    return;
                }
                this.value = proxy[key];
            }
        },
        'input': {
            'text': {
                event: ['input', 'focus'],
                report: function(proxy, key) {
                    if (this.value === 0 || this.value === '') {
                        if (proxy[key] === this.value) {
                            return;
                        }
                    } else if (proxy[key] == this.value) {
                        return;
                    }
                    proxy[key] = this.value;
                },
                boardcast: function(proxy, key) {
                    if (proxy[key] === null) {
                        this.value = "";
                        return;
                    }
                    if (proxy[key] === 0 || proxy[key] === '') {
                        if (proxy[key] === this.value) {
                            return;
                        }
                    } else if (proxy[key] == this.value) {
                        return;
                    }
                    this.value = proxy[key];
                }
            },
            'checkbox': {
                event: ['change'],
                report: function(proxy, key) {
                    if (proxy[key] == this.checked) {
                        return;
                    }
                    proxy[key] = this.checked;
                },
                boardcast: function(proxy, key) {
                    if (proxy[key] == this.value) {
                        return;
                    }
                    this.checked = proxy[key];
                }
            },
            'radio': {
                event: ['change'],
                /**
                 * bind on each radio
                 */
                report: function(proxy, key, elementGroup) {
                    for (var j = 0, groupLength = elementGroup.length; j < groupLength; j++) {
                        if (elementGroup[j].checked == true) {
                            proxy[key] = elementGroup[j].value;
                            break;
                        }
                    }
                },
                /**
                 * only bind once on entity
                 */
                boardcast: function(proxy, key, elementGroup) {
                    for (var j = 0, groupLength = elementGroup.length; j < groupLength; j++) {
                        if (proxy[key] === elementGroup[j].value) {
                            elementGroup[j].checked = true
                            break;
                        }
                    }
                },
                shareBoardcast: true
            }
        }
    };

    var factory = function(strategy) {
        var Entity = function(sourceData, option) {
            this.initialize.apply(this, arguments);
        };

        extend(Entity.prototype, {
            bind: function(sourceData, option) {
                if (typeof sourceData !== 'object') {
                    throw new Error("invalid source data");
                }
                if (option && typeof option !== 'object') {
                    throw new Error("invalid option");
                }
                this.sourceData = sourceData;
                option = option || {};
                option.updateOnCreate = option.updateOnCreate !== false;
                var bindCheck = option.bindCheck !== false;
                var scopeName = option.scope || 'document';
                var namePrefix = option.namePrefix || '';
                var objectNamePrefix = scopeName + '_' + namePrefix + '_';
                var scope;
                if (scopeName == 'document') {
                    scope = window.document;
                } else {
                    scope = window.document.querySelector("[data-scope='" + scopeName + "']");
                    if (!scope) {
                        throw new Error("scope [data-scope='" + scopeName + "'] can not be found");
                        return;
                    }
                }

                for (var key in sourceData) {
                    if (!sourceData.hasOwnProperty(key)) {
                        continue;
                    }
                    (function(proxy, key) {
                        var bindName = namePrefix + key;
                        var elements = scope.querySelectorAll("[data-bind='" + bindName + "']");
                        Object.defineProperty(proxy, key, {
                            enumerable: true,
                            configurable: true
                        });
                        if (elements.length == 0) {
                            Object.defineProperty(proxy, key, {
                                get: function() {
                                    return sourceData[key];
                                },
                                set: function(value) {
                                    sourceData[key] = value;
                                }
                            });
                            if (bindCheck) {
                                throw new Error("element [data-bind='" + bindName + "'] can not be found");
                            }
                            return;
                        } else {
                            Object.defineProperty(proxy, key, {
                                get: function() {
                                    return sourceData[key];
                                },
                                set: function(value) {
                                    sourceData[key] = value;
                                    eventManager.trigger(objectNamePrefix + key, 'change');
                                }
                            });
                        }
                        bindByKey(strategy, proxy, key, elements, objectNamePrefix);
                        if (option.updateOnCreate) {
                            eventManager.trigger(objectNamePrefix + key, 'change');
                        }
                    })(this, key);
                }
            },
            initialize: function(sourceData, option){
                this.bind(sourceData, option);
            },
            toPlainObject: function(prefix) {
                var sourceData = this.sourceData;
                if (prefix) {
                    var newObj = {};
                    for (var key in sourceData) {
                        if (!sourceData.hasOwnProperty(key)) {
                            continue;
                        }
                        newObj[prefix + key] = sourceData[key];
                    }
                    return newObj;
                }
                return sourceData;
            },
            update: function(newData) {
            }
        });

        Entity.extend = extendProps;

        return Entity;
    };

    var defaultEntity = factory(bindStrategy);

    defaultEntity.extendBindStrategy = function(customBindStrategy) {
        var strategy = extend({}, bindStrategy);
        for (var tagName in customBindStrategy) {
            if (!customBindStrategy.hasOwnProperty(tagName)) {
                continue;
            }
            if (typeof customBindStrategy[tagName].boardcast) {
                if (strategy[tagName]) {
                    throw new Error("bind strategy on " + tagName + " already exists");
                }
                strategy[tagName] = customBindStrategy[tagName];
            } else {
                strategy[tagName] = strategy[tagName] || {};
                for (var type in customBindStrategy[tagName]) {
                    if (!customBindStrategy[tagName].hasOwnProperty(type)) {
                        continue;
                    }
                    if (strategy[tagName][type]) {
                        throw new Error("bind strategy on " + tagName + "-" + type + " already exists");
                    }
                    strategy[tagName][type] = customBindStrategy[tagName][type];
                }
            }
        }
        return factory(strategy);
    };

    return defaultEntity;
}();

