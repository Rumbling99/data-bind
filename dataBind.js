var Entity = function(eventManager, bindEvent) {
    return function(data, option) {
        //TODO: check data is object
        //TODO: check option is valid

        //TODO: make a clone of data
        option = option || {};
        option.updateOnCreate = option.updateOnCreate !== false;
        var containerId = option.containerId || 'document';
        var namePrefix = option.namePrefix || '';
        var objectNamePrefix = containerId + '_' + namePrefix + '_';
        var container = containerId == 'document' ? document : document.getElementById(containerId);

        var proxy = {};

        for (var key in data) {
            if (!data.hasOwnProperty(key)) {
                continue;
            }
            (function(proxy, key) {
                Object.defineProperty(proxy, key, {
                    get: function() {
                        return data[key];
                    },
                    set: function(value) {
                        data[key] = value;
                        eventManager.trigger(objectNamePrefix + key, 'change');
                    },
                    enumerable: true,
                    configurable: true
                });

                var bindName = namePrefix + key;
                var element = container.querySelector("[data-bind='" + bindName + "']");
                if (element == null) {
                    throw new Error("element [data-bind='" + bindName + "'] can not be found");
                    return;
                }
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
                        case 'select':
                            eventManager.attach(objectNamePrefix + key, 'change', function() {
                                element.value = proxy[key];
                            });
                            bindEvent(element, 'change', function() {
                                proxy[key] = element.value;
                            });
                            break;
                        case 'checkbox':

                            // eventManager.attach(objectNamePrefix + key, 'change', function() {
                            //     element.value = proxy[key];
                            // });
                            // bindEvent(element, 'change', function() {
                            //     proxy[key] = element.value;
                            // });
                            // break;
                        case 'radio':
                            break;
                    }
                    break;
                case 'textarea':
                    eventManager.attach(objectNamePrefix + key, 'change', function() {
                        element.value = proxy[key];
                    });
                    bindEvent(element, 'change', function() {
                        proxy[key] = element.value;
                    });
                    break;
                }

                if (option.updateOnCreate) {
                    eventManager.trigger(objectNamePrefix + key, 'change');
                }
            })(proxy, key);
        }

        proxy.toPlainObject = function() {
            //TODO: make a clone of data
            return data;
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