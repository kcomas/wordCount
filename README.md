
Counts the number of words on a website, requires casperjs

The word search is case insensative

usage

casper.js wordCount.js url "words seprated by comma" "Number of pages to search 0 for entire site"

example

casper.js wordCount.js http://google.com "google,woot,stuff" 20

In this example searches the first 20 pages of google.com and count the total occurences of google, woot and stuff
