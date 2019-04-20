var variables = {};

var run = true;

// force <br> tag for line breaks
document.execCommand("defaultParagraphSeparator", false, "br");

// select the node that will be observed for mutations
var page = document.getElementById('page');

// options for the observer (which mutations to observe)
var config = { attributes: true, childList: true, characterData: true, subtree: true };

// callback function to execute when mutations are observed
function callback(mutationsList, observer) {
    for (var mutation of mutationsList) {
        // console.log(mutation.type);
        parse(page);
    }
};

function parse(node) {
    if (run) {
        run = false;
        setTimeout(function() { run = true; }, 200); // debounce rapid edits
        for(var v in variables) {
            if (!variables.hasOwnProperty(v)) continue;
            variables[v].active = false;
        }
        var pos = getCursorPos(page);
        node.innerHTML = node.innerHTML.replace(/(?:<\/?span[^>]*>)*/g, '');
        node.innerHTML = node.innerHTML.replace(/&nbsp;/g, ' ');
        if (node.hasChildNodes()) {
            var children = node.childNodes;
            for (var i = 0; i < children.length; i++) {
                if (children[i].tagName == "DIV") {
                    evaluate(children[i], 0, children[i].textContent);
                }
            }
        }
        node.innerHTML = node.innerHTML.replace(/  /g, ' &nbsp;');
        setCursorPos(page, pos); // TO DO - fix position after newlines
    }
}

function evaluate(node, index, statement) {
    var declare = statement.match(/[ \t]*(\w+)[ \t]*=[ \t]*([^\n]*)/); // look for an "a = b" type statement ignoring tabs and spaces
    if (declare != null) {
        var result = evaluate(node, index + declare.index + declare[1].length, declare[2]);
        variables[declare[1]] = {
            'color': '#FF0000',
            'active': true,
            'value': result
        };
        highlight(node, index, declare[1]);
        return result;
    } else if (!isNaN(statement)) {
        return Number(statement);
    } else {
        return '?';
    }
}

function highlight(node, index, variable) {
    var src = node.innerHTML;
    var res = src.replace(variable, '<span class="variable">' + variable + '</span>');
    node.innerHTML = res;
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

// create an observer instance linked to the callback function
var observer = new MutationObserver(callback);

// start observing the target node for configured mutations
observer.observe(page, config);

// iterate over page and calculate result
parse(page);