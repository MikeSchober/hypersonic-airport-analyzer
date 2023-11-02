'use strict';

//using express to create a server...
//basically imports express
const express = require('express');
const fs = require('fs');


//cors installed... allows browser to make request to remote server
//cors also added to dependencies
const cors = require('cors');

//creates our server
const app = express();

//applying cors
app.use(cors());

/*
//get function to retrieve data from our server. in this case, a str to say it's working
app.get('/', function (req, res) {
    res.send('this is working')
});
*/

//port 3001, with function to confirm that our server is running
app.listen(3001, function () {
    console.log('app is running on port 3001!');
});

//to serve static files from server (static files: html, css, js)
//create folder in current folder called "public"
//use following code... try this if ajax request doesnt work
//app.use(express.static(__dirname + '/public'));

//variable to hold airport data from txt file
let aptData = '';

//using the file system module in node.js to read airportData.txt file and to send its contents as a json string to our JS program so that our JS program can parse it into a an array of JS objects
fs.readFile('airportData.txt', function (err, data) {
    if (err) {
        console.log('error!!!');
    } return aptData = (data.toString());
})




//setHeader function equivalent in express??? ('content-type', 'text/html' or 'application/json')

//remember, the "/" is the url to the requested resource on the server. root here, could be "/profile", etc.
//with the path and the requests in express... basically they are if statements to say that "if" you go to this server url, do this, etc.
//example here is request to the root page in the server
app.get("/", (req, res) => {
    //it automatically does JSON.stringify()
    res.send(aptData);
});

//---methods...
//-get... to receive resource
//-post... to create a resource
//-put... to change state or update resource
//-delete... to remove a resource



//for now, we want the following structure to our app
// root/home screen --> res = this is working (our app UI) (GET)
//database update screen --> UI to update the airport DB (PUT)

//later, might want sign-in
//signin screen --> POST success/fail
//register --> POST user
//profile/userID --> Get user


