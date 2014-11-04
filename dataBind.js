var Entity = function(eventManager, bindEvent) {
    /**
     * two-way bind on elements that has same bindName([bindName='xxxx'])
     * group elements by tagName, type, name and then pass them to bindGroup()
     */
    var bindMulti = function(proxy, elements, key, objectNamePrefix) {
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
        // console.log(groupMap);
        for (var groupKey in groupMap) {
            if (!groupMap.hasOwnProperty(groupKey)) {
                continue;
            }
            bindGroup(proxy, groupMap[groupKey], key, objectNamePrefix);
        }
    };
    /**
     * two-way bind on a single element(input-text, textarea, select...) 
     * or on elements that has same name(input-radio, input-checkbox...)
     */
    var bindGroup = function(proxy, elements, key, objectNamePrefix) {
        for (var i = 0, length = elements.length; i < length; i++) {
            var element = elements[i];
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
                        case 'select':
                            eventManager.attach(objectNamePrefix + key, 'change', function() {
                                element.value = proxy[key];
                            });
                            // test how many times
                            bindEvent(element, 'change', function() {
                                proxy[key] = element.value;
                            });
                            break;
                        case 'checkbox':
                        case 'radio':
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
                }
            })(elements[i]);
        }
    };


    return function(sourceData, option) {
        //TODO: check sourceData is object
        //TODO: check option is valid

        option = option || {};
        option.updateOnCreate = option.updateOnCreate !== false;
        var containerId = option.containerId || 'document';
        var namePrefix = option.namePrefix || '';
        var objectNamePrefix = containerId + '_' + namePrefix + '_';
        var container = containerId == 'document' ? document : document.getElementById(containerId);

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
                var elements = container.querySelectorAll("[data-bind='" + bindName + "']");
                if (elements.length == 0) {
                    throw new Error("element [data-bind='" + bindName + "'] can not be found");
                    return;
                }
                bindMulti(proxy, elements, key, objectNamePrefix);
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


var i = {
    name: 'Quan Li', 
    phone: 13302125541, 
    desc: 'a programmer', 
    sex: 'male', 
    role: 'admin'
};
var iEnt = new Entity(i, {
});

// i.name = 3;


iEnt.name = 'c';
// iEnt.phone = 18052569961;