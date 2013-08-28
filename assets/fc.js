/***********
  Setup vars
************/
// Tumblr API stuff
var api_token = '?api_key=[YOUR TUMBLR TOKEN]&callback=?';
var api_url = window.location.protocol + '//api.tumblr.com/v2/blog/fuckedconcept.tumblr.com/';

//Giphy API stuff
var gif_token = '?api_key=dc6zaTOxFJmzC&callback=?'
var gif_url   = window.location.protocol + '//api.giphy.com/v1/gifs/';

var post_count;       // store the number of posts there are as of when we loaded the page
var current_post;     // store the post offset we're looking at now from [0..post_count]
var current_post_id;  // current tumblr post id
var current_gif_id;   // current gif id


/***********
  Utility stuff
************/
function randomInt(max){
    return Math.floor(Math.random()*max)
}

// Get query params form the url. Pass in a param name you're looking for
function getURLParameter(name) {
    var param = decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
    if (param == 'null') {
        param = false;
    } else {
        param = decodeURIComponent((param+'').replace(/\+/g, ' '));
    }
    return param;
}

// Automatic slideshow. Limited to 99 loops so it doesn't just keep loading
// from the tumblr & giphy apis forever. All it does is click "reload" at 8 sec intervals
var p;
var loops = 0;
function autoplay() {
    if (p) {
        clearInterval(p);
        $('#play').html('▶');
        p = false;
        loops = 0;
    } else {
        $('#play').html('❚❚');
        $('#reload').click();
        p = setInterval(function() {
            if (loops > 99) { // don't loop forever, huh?
                autoplay();
            } else {
                loops++;
                $('#reload').click();
            }
        }, 8000);
    }
}

// Set the font size and div height so as to fill up the page.
// This gets triggered with each new concept or page resize so it's ~*~responsive~*~
(function ( $ ) {            
    $.fn.display = function() {
        var originalFontSize = 12;
        $('#word').css({"font-size" : originalFontSize+'px'}); // Make sure we start with 12px always
        var sectionWidth = $('body').width(); // get the body width
        var textWidth = $('#word').width();   // get the width of the word div at 12px
        var newFontSize = (sectionWidth/textWidth) * originalFontSize; // idk why this works really lol
        $('#word').css({"font-size" : parseInt(newFontSize)+'px'});    // but set the new big font size
        $('#word').css({"line-height" : "0.9em"}); // and squeeze the lines a bit cause otherwise the vertical spacing is huge
        $('#concept').height($('#word').height()*0.85); // set the word div height, so it will vertical center. make it a little small because of the line-spacing squeeze above
        $('#word').children("a").css({"color" : '#000', 'opacity' : '1' }); // Now make it black and opaque whee                   
    }
}( jQuery ));

// Callback to put the word in place and do page title and color stuff
function place_word(word) {
    word = word.replace(/\<.*?\>/g, '');
    word = word.replace(/\./g, '');
    $(document).attr('title', word+' is a Fucked Concept'); // Set the page title
    word = word.replace(/ /g, '<br />'); // linebreak on spaces
    $('#spinner').hide(); // get rid of the spinner
    $('#concept span a').css({'color' : '#fff', 'opacity' : '0.5'}); // ghost the old word
    $('#concept span a').html(word); // set the new word

    // Set the current page's permalink and window url bar. This doesn't always work great.
    $('#link a').attr("href", window.location.protocol + window.location.pathname + '?g='+current_gif_id+'&w='+current_post_id);
    window.history.pushState("page", "Title", window.location.pathname+'?g='+current_gif_id+'&w='+current_post_id);
    
    $('body').display(); // set the font size and all that business now
}


/***********
  The Shizz
************/
// To load a whole page, call gif_me()

// set a random or requested gif bg from giphy first, then call word() to update the word
function gif_me(g, w) {
    var g_url = gif_url + 'random' + gif_token; // random endpoint for a new gif

    if (g) {
        g_url = gif_url + g + gif_token; // g is a gif id, id is the endpoint for a specific gif
    }
    
     $.ajax({
        url: g_url,
        dataType: 'text',
        success: function(data) {
            gif = $.parseJSON(data);
            if (g) {
                $('#background').css('background-image', "url("+gif.data.images.original.url+")");
            } else {
                $('#background').css('background-image', "url("+gif.data.image_original_url+")");
            }
            current_gif_id = gif.data.id; // track it for the url and permalink
            word(w); // ok, get the word now
        }
    });      
}

// Get a random post offset between 0 and the cached total number of posts, 
// if we're looking for a random word. Also make sure we're not returning the 
// same one we're looking at already
//
// If we want a specific post just call getPost() with its tumblr ID.
//
// args:
// w: the post ID of the desired word post, if there is one.
function word(w) {
    // track current and new post offset to prevent repeating posts on click
    // nothing we can do about reloads, obviously.
    if (w) {
        getPost(place_word, 1, w);
    } else {
        var get_post = current_post;
        while (get_post == current_post) {
            get_post = randomInt(post_count);
        }
        current_post = get_post;
        getPost(place_word, get_post); 
    }
}


// Get the post at offset "offset", 
// return the post's body element, stripped of html tags, via callback
function getPost(callback, offset, w) {
    if (!offset) { offset = 0; }
    var args = '&limit=1&offset='+offset;
    if (w) {
        args = '&id='+w;
    }
    $.ajax({
        url: api_url + 'posts' + api_token + args,
        dataType: 'jsonp',
        success: function(data) {
            current_post_id = data.response.posts[0].id;
            body = data.response.posts[0].body.replace(/\<.*?\>/g, '');
            body = body.replace(/\./g, '');
            return callback(body);
        }
    });      
}


$(document).ready(function() {
    // don't cache API requests
    $.ajaxSetup({ cache: false });
                    
    // Set a handler to adjust font size if the window changes size
    $(window).resize(function(){$('body').display();});   
    
    // Click handler for refreshing concepts
    $('#reload').click(function(){
        if ($('#instructions').is(":visible")) {
            clearTimeout(t);
            $('#instructions').fadeOut("normal");
        }
        $('#concept span a').css({'color' : '#eee', 'opacity' : '0.7'});
        $('#spinner').show();
        //word(); 
        gif_me();
        return false; 
    });
    
    // Hook up the play button to the autoplay handler 
    $('#play').click(function(){ autoplay(); return false; });   

    // and fade out the instructions after 10 secs
    // if you click reload they get faded out immediately, too
    // (see $('#reload').click() above)
    t=setTimeout(function(){
        $('#instructions').fadeOut("normal");
    }, 10000);
    

    // On first load, pull the blog data and get the number of posts, from tumblr
    // We'll use this as our count for the life of the page
    var tumblr_url = api_url + 'info' + api_token;
    $.ajax({
        url: tumblr_url,
        dataType: 'jsonp',
        success: function(data) {
            post_count = data.response.blog.posts;
            // and now call for the first gif/word pair
            // look for params on first load
            var g = getURLParameter("g");
            var w = getURLParameter("w");
    
            if (g && w) {
                gif_me(g, w); // gall gif_me with url params if any
            } else {
                gif_me(); // otherwise call it plain for randoms.
            }
        }
    });      
    
});
