var variables = {};
var varStyles = '';
var varIndex, colorIndex = 0;

var _debug = false;

// force <br> tag for line breaks
document.execCommand("defaultParagraphSeparator", false, "br");

// select the node that will be observed for mutations
var page = document.getElementById('page');

// options for the observer (which mutations to observe)
var config = { attributes: true, childList: true, characterData: true, subtree: true };

var style = document.createElement('style');
style.type = 'text/css';
document.getElementsByTagName('head')[0].appendChild(style);

// callback function to execute when mutations are observed
var callback = function(mutationsList, observer) {
    for (var mutation of mutationsList) {
        // console.log(mutation.type);
        process(page);
    }
};

var process = function(node) {
    if (_debug) console.log('BEGINNING PROCESS');
    observer.disconnect(); // prevent observer from catching automatic edits
    if (node.innerHTML == '' || node.innerHTML == '<br>') {
        node.innerHTML = '<div><br></div>';
    }
    for (var v in variables) {
        if (!variables.hasOwnProperty(v)) continue;
        variables[v].active = false;
    }
    varStyles = '';
    varIndex = 0;
    var pos = getCursorPos(page);
    node.innerHTML = node.innerHTML.replace(/(?:<\/?span[^>]*>)*/g, '');
    if (node.hasChildNodes()) {
        var children = node.childNodes;
        for (var i = 0; i < children.length; i++) {
            if (children[i].tagName == "DIV") {
                // TO DO - split this text instead of evaluating
                parse(children[i], children[i].textContent);
                // evaluate(children[i], 0, children[i].textContent); // evaluate each line captured in a <div> tag
            }
        }
    }
    style.innerHTML = varStyles;
    setCursorPos(page, pos); // TO DO - fix position after newlines
    observer.observe(page, config); // restart observer
}

var parse = function(node, statement) {
    statement = statement.replace(/[  \t]+/g, ' '); // replace multiple spaces with single space
    statement = statement.replace(/^[ \t]+|[ \t]+$/g, ''); // remove spaces from start or end of line
    statement = statement.replace(/([\w.])([\(\)*\/+\-,=])/g, '$1 $2'); // ensure there is a space before an operator
    statement = statement.replace(/([\(\)*\/+\-,=])([\w.])/g, '$1 $2'); // ensure there is a space after an operator
    var sections = statement.split(' ');
    if (sections.length == 1 && sections[0].length == 0) return '??'; // resolve empty values
    if (sections[1] == '=') {
        if (_debug) console.log('Declaration: ' + statement);
        var remainder = sections.slice(2, sections.length).join(' ');
        if (remainder.length > 0) {
            if (_debug) console.log('    Remainder: ' + remainder);
            var result = parse(node, remainder);
            highlight(node, sections[0], result);
            return result;
        }
    } else {
        if (_debug) console.log('Value: ' + statement);
        var formula = [];
        var end = -1;
        for (var i = 0; i < sections.length; i++) {
            var match = -1;
            for (var v in variables) {
                if (!variables.hasOwnProperty(v)) continue;
                if (sections[i] == v && variables[v].active == true) {
                    match = v;
                    break;
                } // TO DO - match function names
            }
            if (match != -1) {
                if (_debug) console.log('    Variable: ' + sections[i] + ' => ' + variables[match].result);
                formula.push(variables[match].result);
                highlight(node, match);
                end = i;
            } else if (!isNaN(sections[i])) {
                if (_debug) console.log('    Number: ' + sections[i] + ' => ' + Number(sections[i]));
                formula.push(Number(sections[i]));
                end = i;
            } else if (sections[i].search(/[\(\)*\/+\-]/) > -1) { // TO DO - allow power and other functions as operators
                if (_debug) console.log('    Operator: ' + sections[i]);
                formula.push(sections[i]);
                end = i;
            } else {
                break;
            }
        }
        if (end == -1) { // no match, skip 1 section
            var remainder = sections.slice(1, sections.length).join(' ');
            if (_debug) console.log('    Remainder: ' + remainder);
            parse(node, remainder);
            return '??';
        }
        if (end + 1 < sections.length) { // continue processing remainder
            var remainder = sections.slice(end + 1, sections.length).join(' ');
            if (_debug) console.log('    Remainder: ' + remainder);
            parse(node, remainder);
        }
        // evaluate formula
        var result;
        try {
            result = eval(formula.join(' ')); // TO DO - build math engine to replace eval
        } catch (e) {
            if (e instanceof SyntaxError) {
                result = '??';
            }
        }
        if (!isNaN(result)) {
            return result;
        } else {
            return '??';
        }
    }
}

var highlight = function(node, v, value = null) {
    // highlight variable
    var regex = new RegExp(v + '(?!<\/span>)', '');
    node.innerHTML = node.innerHTML.replace(regex, '<span class="variable var-' + varIndex + '">' + v + '</span>');
    if (value != null) {
        // store in object
        variables[v] = {
            'active': true,
            'result': value
        };
    }
    // variables[v].color = getColor(varIndex.toString(10).repeat(10));
    variables[v].color = getColor(v);
    varStyles += '.variable.var-' + varIndex + ' {\n';
    varStyles += 'background-color: rgb(' + variables[v].color.main.r + ', ' + variables[v].color.main.g + ', ' + variables[v].color.main.b + ');\n';
    varStyles += 'border-color: rgb(' + variables[v].color.dark.r + ', ' + variables[v].color.dark.g + ', ' + variables[v].color.dark.b + ');\n';
    varStyles += '}\n\n';
    varStyles += '.variable.var-' + varIndex + '::after {\n';
    varStyles += 'content: "' + formatNum(variables[v].result) + '";\n';
    varStyles += 'background-color: rgb(' + variables[v].color.dark.r + ', ' + variables[v].color.dark.g + ', ' + variables[v].color.dark.b + ');\n';
    varStyles += '}\n\n';
    varIndex++;
}

var formatNum = function(number) {
    if (isNaN(number)) return '??';
    var result = Number(number.toPrecision(3)); // TO DO - user selectable sig figs
    if (result == Infinity) {
        result = '∞';
    } else if (Math.abs(number) > Math.pow(10, 7)) {
        result = result.toExponential();
    } else if (Math.abs(number) < Math.pow(10, -6) && number != 0) {
        result = result.toExponential();
    }
    return result;
}

var createRange = function(node, chars, range) {
    if (!range) {
        range = document.createRange();
        range.selectNode(node);
        range.setStart(node, 0);
    }

    if (chars.count === 0) {
        range.setEnd(node, chars.count);
    } else if (node && chars.count > 0) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.length < chars.count) {
                chars.count -= node.textContent.length;
            } else {
                range.setEnd(node, chars.count);
                chars.count = 0;
            }
        } else {
            for (var lp = 0; lp < node.childNodes.length; lp++) {
                range = createRange(node.childNodes[lp], chars, range);

                if (chars.count === 0) {
                    break;
                }
            }
        }
    }

    return range;
};

var setCursorPos = function(node, chars) {
    if (chars >= 0) {
        var selection = window.getSelection();

        range = createRange(node, { count: chars });

        if (range) {
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
};

var isChildOf = function(node, parentNode) {
    while (node !== null) {
        if (node === parentNode) {
            return true;
        }
        node = node.parentNode;
    }

    return false;
};

var getCursorPos = function(parentNode) {
    var selection = window.getSelection(),
        charCount = -1,
        node;

    if (selection.focusNode) {
        if (isChildOf(selection.focusNode, parentNode)) {
            node = selection.focusNode;
            charCount = selection.focusOffset;

            while (node) {
                if (node === parentNode) {
                    break;
                }

                if (node.previousSibling) {
                    node = node.previousSibling;
                    charCount += node.textContent.length;
                } else {
                    node = node.parentNode;
                    if (node === null) {
                        break
                    }
                }
            }
        }
    }

    return charCount;
}

var getAscii = function(str) {
    return str.split('')
        .map(function(char) {
            return char.charCodeAt(0);
        })
        .reduce(function(current, previous) {
            return previous + current;
        });
}

var HSVtoRGB = function(h, s, v) {
    var r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0:
            r = v, g = t, b = p;
            break;
        case 1:
            r = q, g = v, b = p;
            break;
        case 2:
            r = p, g = v, b = t;
            break;
        case 3:
            r = p, g = q, b = v;
            break;
        case 4:
            r = t, g = p, b = v;
            break;
        case 5:
            r = v, g = p, b = q;
            break;
    }
    return {
        'r': Math.round(r * 255),
        'g': Math.round(g * 255),
        'b': Math.round(b * 255)
    };
}

var getColor = function(str) {
    var hue = (getAscii(str) % 50) / 50; // pseudo-random color from string
    return {
        'main': HSVtoRGB(hue, 1, 0.95),
        'dark': HSVtoRGB(hue, 1, 0.85)
    };
}

// create an observer instance linked to the callback function
var observer = new MutationObserver(callback);

// start observing the target node for configured mutations
observer.observe(page, config);

// iterate over page and calculate result
process(page);