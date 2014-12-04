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
    var bindByKey = function(strategy, proxy, key, scope, elements, objectNamePrefix) {
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
        // var elementGroup;
                    // elementGroup = elementGroup || 
                    //     scope.querySelectorAll("[name='" 
                    //     + element.name + "'][data-bind='" 
                    //     + element.getAttribute('data-bind') + "']");
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
                    bindByKey(strategy, proxy, key, scope, elements, objectNamePrefix);
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

