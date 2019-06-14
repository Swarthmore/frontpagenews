var static = require('node-static');
var request = require('request');
var moment = require('moment');
var und = require('underscore');
var fs = require('fs');
const countryList = require('country-list');
var cron = require('node-cron');

var api_url = "https://api.pressreader.com/v1/publications/";
var api_key = process.env.PRESSREADER_API_KEY


var options = {
    url: api_url,
    headers: {
        'Ocp-Apim-Subscription-Key': api_key
    }
}



// Set up static file server
var file = new static.Server('./public');
require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        //
        // Serve files!
        //
        file.serve(request, response);
    }).resume();
}).listen(8000);


// Set up cron job to load new file
// Reload each morning
cron.schedule('15 6 * * *', () => {
   console.log('Refreshing publication list');
   loadPublications();
});




function loadPublications() {
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var r = JSON.parse(body)

            // Filter out only this week's publications
            latest_publications = und.filter(r.publications, function(p) { 
                // Allow if the latestIssueDate is within the last week
                return moment(p.latestIssueDate).isAfter(moment().subtract(7, 'days'));
            });

            // Convert country codes to names
            for (var p of latest_publications) {
                var countryNames = [];
                for (var c of p.countries) {
                    countryNames.push(countryList.getName(c));
                }
                p.countryNames = countryNames;
            }

            fs.writeFile("./public/publications.json", JSON.stringify(latest_publications), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("The file was saved!");
                }
            }); 
        } else {
            console.log("Error getting PressReader API data");
            console.warn(error);

        }
    })
}
