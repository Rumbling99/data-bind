var Entity = function(eventManager, bindEvent) {
    /**
     * two-way bind on elements that has same bindName([data-bind='bindName'])
     * group elements by tagName, type, name and then pass them to bindGroup()
     */
    var bindMulti = function(proxy, key, scope, elements, objectNamePrefix) {
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
            bindGroup(proxy, key, scope, groupMap[groupKey], objectNamePrefix);
        }
    };
    /**
     * two-way bind on non-group elements(input-text, textarea, select ...) 
     * or on a group of elements that has same name(input-radio ...)
     */
    var bindGroup = function(proxy, key, scope, elements, objectNamePrefix) {
        var radioGroup;
        for (var i = 0, elementLength = elements.length; i < elementLength; i++) {
            (function(element) {
                switch (element.tagName.toLowerCase()) {
                default:
                    throw new Error("data bind on " + element.tagName + " is not supported");
                    break;
                case 'input':
                    switch (element.type) {
                    default:
                        throw new Error("data bind on input-" + element.type + " is not supported");
                        break;
                    case 'text':
                        eventManager.attach(objectNamePrefix + key, 'change', function() {
                            element.value = proxy[key];
                        });
                        bindEvent(element, 'keyup', function() {
                            proxy[key] = element.value;
                        });
                        break;
                    case 'checkbox':
                        eventManager.attach(objectNamePrefix + key, 'change', function() {
                            element.checked = proxy[key];
                        });
                        bindEvent(element, 'change', function() {
                            proxy[key] = element.checked;
                        });
                        break;
                    case 'radio':
                        /**
                         * only bind once on entity
                         */
                        if (!radioGroup) {
                            radioGroup = radioGroup || 
                                scope.querySelectorAll("[name='" 
                                + element.name + "'][data-bind='" 
                                + element.getAttribute('data-bind') + "']");
                            eventManager.attach(objectNamePrefix + key, 'change', function() {
                                for (var j = 0, groupLength = radioGroup.length; j < groupLength; j++) {
                                    if (proxy[key] === radioGroup[j].value) {
                                        radioGroup[j].checked = true
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
                            for (var j = 0, groupLength = radioGroup.length; j < groupLength; j++) {
                                if (radioGroup[j].checked == true) {
                                    proxy[key] = radioGroup[j].value;
                                    break;
                                }
                            }
                        });
                        break;
                    }
                    break;
                case 'textarea':
                    eventManager.attach(objectNamePrefix + key, 'change', function() {
                        element.value = proxy[key];
                    });
                    bindEvent(element, 'keyup', function() {
                        proxy[key] = element.value;
                    });
                    break;
                case 'select':
                    eventManager.attach(objectNamePrefix + key, 'change', function() {
                        element.value = proxy[key];
                    });
                    bindEvent(element, 'change', function() {
                        proxy[key] = element.value;
                    });
                    break;
                case 'span':
                    break;
                }
            })(elements[i]);
        }
    };

    return function(sourceData, option) {
        //TODO: check sourceData is object
        //TODO: check option is valid

        option = option || {};
        option.updateOnCreate = option.updateOnCreate !== false;
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
                Object.defineProperty(proxy, key, {
                    get: function() {
                        return sourceData[key];
                    },
                    set: function(value) {
                        sourceData[key] = value;
                        eventManager.trigger(objectNamePrefix + key, 'change');
                    },
                    enumerable: true,
                    configurable: true
                });

                var bindName = namePrefix + key;
                var elements = scope.querySelectorAll("[data-bind='" + bindName + "']");
                if (elements.length == 0) {
                    throw new Error("element [data-bind='" + bindName + "'] can not be found");
                    return;
                }
                bindMulti(proxy, key, scope, elements, objectNamePrefix);
                if (option.updateOnCreate) {
                    eventManager.trigger(objectNamePrefix + key, 'change');
                }
            })(proxy, key);
        }

        proxy.toPlainObject = function() {
            return sourceData;
        };
        proxy.update = function(newData) {
        };

        return proxy;
    };
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
 * dependency: bindEvent(html) function
 */
function(element, event, handler) {
    if (element.addEventListener) {
        element.addEventListener(event, handler, false);
    }   else {
        element.attachEvent('on' + event, handler);
    }
}
);

