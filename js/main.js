// force <br> tag for line breaks
document.execCommand("defaultParagraphSeparator", false, "br");

// select the node that will be observed for mutations
var targetNode = document.getElementById('page');

// options for the observer (which mutations to observe)
var config = { attributes: true, childList: true, characterData: true };

// callback function to execute when mutations are observed
var callback = function(mutationsList, observer) {
    for (var mutation of mutationsList) {
        if (mutation.type == 'childList') {
            console.log('A child node has been added or removed.');
        } else if (mutation.type == 'attributes') {
            console.log('The ' + mutation.attributeName + ' attribute was modified.');
        } else if (mutation.type == 'characterData') {
            console.log('Character data has been modified');
        }
    }
};

// create an observer instance linked to the callback function
var observer = new MutationObserver(callback);

// start observing the target node for configured mutations
observer.observe(targetNode, config);