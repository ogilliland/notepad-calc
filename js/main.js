var variables = {};
var varStyles = '';
var varIndex, colorIndex = 0;

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
function callback(mutationsList, observer) {
    for (var mutation of mutationsList) {
        // console.log(mutation.type);
        parse(page);
    }
};

function parse(node) {
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
                evaluate(children[i], 0, children[i].textContent); // evaluate each line captured in a <div> tag
            }
        }
    }
    style.innerHTML = varStyles;
    setCursorPos(page, pos); // TO DO - fix position after newlines
    observer.observe(page, config); // restart observer
}

function evaluate(node, index, statement) {
    var declare = statement.match(/[  \t]*(\w+)[  \t]*=[  \t]*([^\n]*)/); // look for an "a = b" type statement ignoring tabs and spaces
    if (declare != null) {
        var result = evaluate(node, index + declare.index + declare[1].length, declare[2]);
        variables[declare[1]] = {
            'active': true,
            'result': result
        };
        highlight(node, index, declare[1]);
        return result;
    } else if (!isNaN(statement) && statement.length > 0) {
        return Number(statement);
    } else {
        return '??';
    }
}

function highlight(node, index, v) {
    var src = node.innerHTML;
    var res = src.replace(v, '<span class="variable var-' + varIndex + '">' + v + '</span>');
    node.innerHTML = res;
    // variables[v].color = getColor(varIndex.toString(10).repeat(10));
    variables[v].color = getColor(v);
    varStyles += '.variable.var-' + varIndex + ' {\n';
    varStyles += 'background-color: rgb(' + variables[v].color.main.r + ', ' + variables[v].color.main.g + ', ' + variables[v].color.main.b + ');\n';
    varStyles += 'border-color: rgb(' + variables[v].color.dark.r + ', ' + variables[v].color.dark.g + ', ' + variables[v].color.dark.b + ');\n';
    varStyles += '}\n\n';
    varStyles += '.variable.var-' + varIndex + '::after {\n';
    varStyles += 'content: "' + variables[v].result + '";\n';
    varStyles += 'background-color: rgb(' + variables[v].color.dark.r + ', ' + variables[v].color.dark.g + ', ' + variables[v].color.dark.b + ');\n';
    varStyles += '}\n\n';
    varIndex++;
}

function createRange(node, chars, range) {
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

function setCursorPos(node, chars) {
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

function isChildOf(node, parentNode) {
    while (node !== null) {
        if (node === parentNode) {
            return true;
        }
        node = node.parentNode;
    }

    return false;
};

function getCursorPos(parentNode) {
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

function getAscii(str) {
    return str.split('')
        .map(function(char) {
            return char.charCodeAt(0);
        })
        .reduce(function(current, previous) {
            return previous + current;
        });
}

function HSVtoRGB(h, s, v) {
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

function getColor(str) {
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
parse(page);