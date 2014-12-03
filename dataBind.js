try {
    Object.defineProperty({}, 0, {
        enumerable: true,
        configurable: true
    });
} catch (e) {
    throw new Error("your browser is not supported by 'databind', please use IE9+, Chrome or Firefox");
}

var Entity = function(eventManager, bindEvent, extend) {
    var uid = (function() {
        return Math.random().toString().substring(2, 17);
    });

    /**
     * two-way bind on elements that has same bindName([data-bind='bindName'])
     * group elements by tagName, type, name and then pass them to bindGroup()
     */
    var bindMulti = function(strategy, proxy, key, scope, elements, objectNamePrefix) {
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
            bindGroup(strategy, proxy, key, scope, groupMap[groupKey], objectNamePrefix);
        }
    };
    /**
     * two-way bind on non-group elements(input-text, textarea, select ...) 
     * or on a group of elements that has same name(input-radio ...)
     */
    var bindGroup = function(strategy, proxy, key, scope, elements, objectNamePrefix) {
        var elementGroup;
        var bindStrategy = strategy;
        for (var i = 0, elementLength = elements.length; i < elementLength; i++) {
            (function(element) {
                var tagName = element.tagName.toLowerCase();
                var type = element.type;
                if (bindStrategy.hasOwnProperty(tagName)) {
                    if (typeof bindStrategy[tagName] === 'function') {
                        bindStrategy[tagName].call(element, eventManager, bindEvent, proxy, key, objectNamePrefix, scope, elementGroup);
                    } else {
                        if (bindStrategy[tagName].hasOwnProperty(type)) {
                            bindStrategy[tagName][type].call(element, eventManager, bindEvent, proxy, key, objectNamePrefix, scope, elementGroup);
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
        'textarea': function(eventManager, bindEvent, proxy, key, objectNamePrefix) {
            var element = this;
            eventManager.attach(objectNamePrefix + key, 'change', function() {
                element.value = proxy[key];
            });
            bindEvent(element, 'keyup', function() {
                if (proxy[key] == element.value) {
                    return;
                }
                proxy[key] = element.value;
            });
        },
        'select': function(eventManager, bindEvent, proxy, key, objectNamePrefix) {
            var element = this;
            eventManager.attach(objectNamePrefix + key, 'change', function() {
                element.value = proxy[key];
            });
            bindEvent(element, 'change', function() {
                proxy[key] = element.value;
            });
        },
        'input': {
            'text': function(eventManager, bindEvent, proxy, key, objectNamePrefix) {
                var element = this;
                var changeElementValue = function() {
                    if (proxy[key] == element.value) {
                        return;
                    }
                    proxy[key] = element.value;
                };
                eventManager.attach(objectNamePrefix + key, 'change', function() {
                    if (proxy[key] == element.value) {
                        return;
                    }
                    element.value = proxy[key];
                });
                bindEvent(element, 'input', changeElementValue);
                // bindEvent(element, 'keyup', changeElementValue);
                // bindEvent(element, 'focus', changeElementValue);
            },
            'checkbox': function(eventManager, bindEvent, proxy, key, objectNamePrefix) {
                var element = this;
                eventManager.attach(objectNamePrefix + key, 'change', function() {
                    element.checked = proxy[key];
                });
                bindEvent(element, 'change', function() {
                    proxy[key] = element.checked;
                });
            },
            'radio': function(eventManager, bindEvent, proxy, key, objectNamePrefix, scope, elementGroup) {
                var element = this;
                /**
                 * only bind once on entity
                 */
                if (!elementGroup) {
                    elementGroup = elementGroup || 
                        scope.querySelectorAll("[name='" 
                        + element.name + "'][data-bind='" 
                        + element.getAttribute('data-bind') + "']");
                    eventManager.attach(objectNamePrefix + key, 'change', function() {
                        for (var j = 0, groupLength = elementGroup.length; j < groupLength; j++) {
                            if (proxy[key] === elementGroup[j].value) {
                                elementGroup[j].checked = true
                                break;
                            }
                        }
                    });
                }
                /**
                 * bind on each radio
                 */
                bindEvent(element, 'change', function() {
                    var value = '';
                    for (var j = 0, groupLength = elementGroup.length; j < groupLength; j++) {
                        if (elementGroup[j].checked == true) {
                            proxy[key] = elementGroup[j].value;
                            break;
                        }
                    }
                });
            }
        }
    };

    var factory = function(strategy) {
        var Entity = function(sourceData, option) {
            if (typeof sourceData !== 'object') {
                throw new Error("invalid source data");
            }
            if (typeof option !== 'object') {
                throw new Error("invalid option");
            }

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

            var proxy = {};

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
                    bindMulti(strategy, proxy, key, scope, elements, objectNamePrefix);
                    if (option.updateOnCreate) {
                        eventManager.trigger(objectNamePrefix + key, 'change');
                    }
                })(proxy, key);
            }

            proxy.toPlainObject = function(prefix) {
                if (prefix) {
                    var newObj = {};
                    for ( var key in sourceData) {
                        if (!sourceData.hasOwnProperty(key)) {
                            continue;
                        }
                        newObj[prefix + '.' + key] = sourceData[key];
                    }
                    return newObj;
                }
                return sourceData;
            };
            proxy.update = function(newData) {
            };

            return proxy;
        };
        return Entity;
    };

    var defaultEntity = factory(bindStrategy);

    defaultEntity.extendBindStrategy = function(customBindStrategy) {
        var strategy = extend({}, bindStrategy);
        for (var tagName in customBindStrategy) {
            if (!customBindStrategy.hasOwnProperty(tagName)) {
                continue;
            }
            if (typeof customBindStrategy[tagName] === 'function') {
                if (strategy[tagName]) {
                    throw new Error("bind strategy on " + tagName + " already exists");
                }
                strategy[tagName] = customBindStrategy[tagName];
            }
            if (typeof customBindStrategy[tagName] === 'object') {
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
}(
/**
 * dependency: EventManager
 */
function() {
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
    return eventManager;
}(),
/**
 * dependency: bindEvent() function(html)
 */
function(element, event, handler) {
    if (element.addEventListener) {
        element.addEventListener(event, handler, false);
    } else {
        element.attachEvent('on' + event, handler);
    }
},
/**
 * dependency: extend() function
 */
function(target) {
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
}
);

