
var casper = require('casper').create();

//set the useragent to chrome
casper.userAgent('Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');

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

if(url.lastIndexOf('/') === url.length-1){
    url = url.substr(0,url.length-1);
}

/**
 * The words to search for
 * @type {array}
 */
var words = casper.cli.get(1);

//add a comma if not one there
if(words.indexOf(',') === -1){
    words = words + ',placeholderNullChar';
}
    words = words.split(',');

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

completed.push(url+'/');

/**
 * The word count for the word
 * @type {object}
 * @property {string} key - the word we are searching for
 * @property {number} count - the number of times the word has been found
 * @property {array} pages - the pages the url appears on
 */
var wordCount = {};

words.forEach(function(word){
    wordCount[word] = {
        count : 0,
        pages : []
    };
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
    //check if the link has the index of the base url
    if(link.indexOf(url) === 0){
        return link;
    }
    //check if the url is just the url with a /
    if((link+'/') === url){
        return null;
    }
    //stop // at the beginging
    if(link.indexOf('//') === 0){
        return null;
    }
    if(link.match('https?:\/\/')){
        return null;
    }
    if(link.indexOf(url) === 0){
        return link;
    }
    if(link.indexOf('/') === 0){
        return url + link;
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
 * Print the word count
 */
casper.printCount = function(){
    if(wordCount.placeholderNullChar){
        delete wordCount.placeholderNullChar;
    }
    //done
    try {
        var keys = Object.keys(wordCount);
        for(var i=0,l=keys.length; i<l; i++){
            if(keys[i] !== 'placeholderNullChar'){
                this.echo(keys[i] + ' : ' + wordCount[keys[i]].count + ' : ' + JSON.stringify(wordCount[keys[i]].pages));
            }
        }
    }catch(err){
        this.echo(err);
        this.echo(JSON.stringify(wordCount).replace('{','').replace('}',''));
    }
};


/**
 * Search the webpage, get all of the links on the page and do a word count for that page
 */
casper.spider = function(){
    return this.then(function(){
        if(queue.length === 0){
            this.printCount();        
            return;
        }
        if(maxPages !== 0){
            if(maxPages === currentPage){
                this.printCount();
                return;
            }
        }
        var currentLink = queue.shift();
        completed.push(currentLink);
        this.echo(currentLink);
        this.thenOpen(currentLink,function(){
            var time = Math.floor(Math.random() * 5000) + 1000;
            this.wait(time,function(){
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
                currentPage++;
                //search the current page for the words
                wordCount = this.evaluate(function(wordCount,currentLink){
                    for(key in wordCount){
                        var count = (document.body.textContent.match(new RegExp(key,'gi')) || []).length;
                        if(count > 0){
                            wordCount[key].count += count;
                            wordCount[key].pages.push(currentLink);
                        }
                    }
                    return wordCount;
                },wordCount,currentLink);
                return this.spider();
            });
        });
    });
};

casper.spider();

casper.run();
