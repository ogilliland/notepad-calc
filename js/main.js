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
        setTimeout(function() { run = true; }, 500);
        if (node.hasChildNodes()) {
            var children = node.childNodes;
            for (var i = 0; i < children.length; i++) {
                if (children[i].tagName == "DIV") {
                    evaluate(children[i], 0, children[i].textContent);
                }
            }
        }
    }
}

function evaluate(node, index, statement) {
    var declare = statement.match(/[ \t]*(\w+)[ \t]*=[ \t]*([^\n]*)/); // look for an "a = b" type statement ignoring tabs and spaces
    if (declare != null) {
        var result = evaluate(node, index + declare.index + declare[1].length, declare[2]);
        variables[declare[1]] = {
            'color': '#FF0000',
            'value': result
        };
        highlight(node, index, declare[1]);
        return result;
    } else if (!isNaN(statement)) {
        return statement;
    } else {
        return '?';
    }
}

function highlight(node, index, variable) {
    var src = node.innerHTML;
    var regex = new RegExp('(?:<span [^>]*>)*(' + variable + ')(?:<\/span>)*', 'g');
    var res = src.replace(regex, '<span class="variable">' + variable + '</span>');
    node.innerHTML = res;
}

// create an observer instance linked to the callback function
var observer = new MutationObserver(callback);

// start observing the target node for configured mutations
observer.observe(page, config);

// iterate over page and calculate result
parse(page);