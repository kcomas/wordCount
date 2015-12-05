
var casper = require('casper').create();

/**
 * The maximum number of pages to search defaults to 10 0 for entire site
 * @type {number}
 */
var maxPages = parseInt(casper.cli.get(2));

/**
 * The current page we are on
 * @type {number}
 */
var currentPage = 0;

if(isNaN(maxPages)){
    maxPages = 10;
}

/**
 * The base url of the website
 * @type {string}
 */
var url = casper.cli.get(0);

/**
 * The words to search for
 * @type {array}
 */
var words = casper.cli.get(1).split(',');

/**
 * The current queue we are searching for
 * @type {array}
 */
var queue = [];

queue.push(url);

/**
 * The urls that we have searched
 * @type {array}
 */
var completed = [];

/**
 * The word count for the word
 * @type {object}
 * @property {string} key - the word we are searching for
 * @property {number} value - the number of times the word has been found
 */
var wordCount = {};

words.forEach(function(word){
    wordCount[word] = 0;
});

casper.start();

/**
 * Convert a url into a usable url
 * @param {string} url - the url to convert
 * @param {string} currentLink the current link of the page
 * @return {string} - the converted link
 */
var convert = function(link,currentLink){
    //remove hashes
    if(link.indexOf('#') > -1){
        link = link.substr(0,link.indexOf('#'));
    }
    if(link.indexOf(url) === 0){
        return link;
    }
    if(link.indexOf('/') === 0){
        return url + link;
    }
    if(link.match('https?:\/\/')){
        return null;
    }
    //check if the link has an index of the ... format
    if(link.indexOf('../') > -1){
        //count the occurences of ../
        var count = (link.match(/..\//g) || []).length;
        currentLink = currentLink.replace(url,'');
        currentLink = currentLink.split('/');
        for(var i=0; i<count; i++){
            currentLink.pop();
        }
        return url + '/' + currentLink.join('/') + '/' + link.replace(/..\//g,'');
    }
    //convert the link assuimg it is just a page link
    return url + '/' + link;
};

/**
 * Search the webpage, get all of the links on the page and do a word count for that page
 */
casper.spider = function(){
    return this.then(function(){
        if(queue.length === 0){
            //done
            for(key in wordCount){
                this.echo(key + ' : ' + wordCount[key]);
            }
            return;
        }
        if(maxPages !== 0){
            if(maxPages === currentPage){
                //done
                for(key in wordCount){
                    this.echo(key + ' : ' + wordCount[key]);
                }
                return;
            }
        }
        var currentLink = queue.shift();
        this.thenOpen(currentLink,function(){
            this.wait(2000,function(){
                //find all of the links on the page
                var links = this.evaluate(function(){
                    var links = [];
                    var a = document.querySelectorAll('a');
                    for(var i=0,l=a.length; i<l; i++){
                        links.push(a[i].getAttribute('href'));
                    }
                    return links;
                });
                //convert the links to an conplient standard
                links.forEach(function(link){
                    link = convert(link,currentLink);
                    if(link){
                        //check if the link is in the queue or completed
                        if(queue.indexOf(link) === -1){
                            if(completed.indexOf(link) === -1){
                                queue.push(link);
                            }
                        }
                    }
                });
                completed.push(currentLink);
                this.echo(currentLink);
                currentPage++;
                //search the current page for the words
                wordCount = this.evaluate(function(wordCount){
                    for(key in wordCount){
                        wordCount[key] += (document.body.textContent.match(new RegExp(key,'gi')) || []).length;
                    }
                    return wordCount;
                },wordCount);
                return this.spider();
            });
        });
    });
};

casper.spider();

casper.run();
