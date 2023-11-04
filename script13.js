/*Copyright (c) 2023 by Mike Schober*/

'use strict';

//global variables...
//variable to hold the value of the text wx input
let wxInput = '';

//variable to hold all airport ids in current request
let aptIds = [];

//variable to hold all METAR and TAF data strings
let wxArr = [];

//variable to hold all METAR data
let wxMETAR = [];

//vcariable to hold all TAF data
//holds each TAF as a string within the array
let wxTAF = [];

//variable to hold all report objects (report objects contain METARs)
//map with key:value apt id:Report object for that airport
let reports = new Map();

//variable to hold all forecast objects
//map with key:value apt id:forecast object
let forecasts = new Map();

//variable to hold all notams as strings in array
let notamD = [];

//variable to hold all fdc notams
let notamFDC = [];

//variable to hold all notam objects (like reports, it a map)
//airport id: Notam object
//did not use this, except in concept testing
// let notams = new Map();

//to determine current date and time (UTC)
//d = current date/time local
let d = new Date()

/* did not use these values from the global scope
//current date/time utc
const zTime = d.toUTCString();

//current hour utc (rounded down)
const hour = d.getUTCHours();
*/

//create current utc time display later...

///////////////////////////////////////////////////////////////
//selecting DOM elements
//wx submit button
const sButton = document.getElementById('button1');

//the wx textarea content
const textBox = document.getElementById('wx-box');

//selecting the wx-output class in the html doc
const metarOutput = document.getElementById('output');

//selecting the wx input section of the html doc
const userInput = document.querySelector('.wx-input');

//selecting the reset button
const resetButton = document.getElementById('button2');

//selecting the get started button in the intro modal...
const startButton = document.getElementById('start');

//selecting the intro modal...
const introModal = document.getElementById('intro');


//NOTAM dom elements...
//selecting the NOTAM submit button
const notamSubmitB = document.getElementById('button3');

//selecting the NOTAM textbox
const notamBox = document.getElementById('notam-box');

//there is no notam output section as of now, so no need to select a specific notam output section

//selecting the notam input section as a whole so that we can display/hide it when needed
//defaults to hidden. only displayed after user submits the wx data
const notamInput = document.querySelector('.notam-input');


///////////////////////////////////////////////////////////////

//event listeners for button clicks

//add event listener to the wx submit buttom... calls function when clicked
sButton.addEventListener('click', saveData);

//event listener to the reset button
resetButton.addEventListener('click', resetData);

startButton.addEventListener('click', openProgram);

//event listener for the notam submit button
notamSubmitB.addEventListener('click', notamSub);

//event listener for general click
//toSelect() callback function uses event.target to get the id from the clicked element and displays a modal, etc.
document.addEventListener('click', toSelect);

//////////////////////////////////

///////////////////////////////////////////////////////////////////////
//CLASSES DEFINED

//defining airport object class... will hold metar data for each airport
class Report {
    constructor(id, metar, cig, vis, rvr, wind, fltCat) {
        this.id = id;
        this.metar = metar;
        this.cig = cig;
        this.vis = vis;
        this.rvr = rvr;
        this.wind = wind;
        this.fltCat = fltCat;
    }

};


//defining taf object class... will hold taf data for each individual taf line (used in code line 307)
class Taffy {
    constructor(line, cig, vis, wind, vWinds, fltCat) {
        this.line = line;
        this.cig = cig;
        this.vis = vis;
        this.wind = wind;
        this.vWinds = vWinds;
        this.fltCat = fltCat;

        //vWinds added 7/9/23... true if vrb winds exist in the taf line, false otherwise

    }

};


//defining Forecast class... map to hold each taf line's data
//method to take zulu time as argument and return report-like object. use regex to detemine taf line times, and use time ranges in an array to determine applicability...
//bc keys in a map can be any data type, you can use map to hold all taf line objects... you can use an array with start and end times of each taf line as keys, with values of report-object like objects that hold the taf line data attributes for use in the getAirportData() function
//so... need to add the creating of Forecast objects within the saveData() function. code line 261 for pseudo-code---done!

class Forecast {
    constructor(id, taf) {
        this.id = id;
        this.taf = taf;
        this.taflines = [];
    }

    //getter... allows us to define a method which can be called like a property of the object. method returns a dataset that we want to use, the taf-lines array
    //look for each FM statement in the taf... formatted like this: FM270200
    //as long as the date in the FM statement is today or tomorrow, take time of issuance to first FM statement as first taf period, then FM statement to FM statement from then. after last FM statement, take the end time of the TAF from the beginning of the taf, formatted: 261720Z 2618/2724, (27th at 00Z), endtime of the taf as the last element in the array
    get tafTimes() {

        //variables for use in this method

        //variable to hold current date from which we can set zulu date/times for each taf period
        //current time zone date/time...
        let currD = new Date();

        //output array
        let timeIndices = [];

        //code to create array described abv...

        //regex for the FM statements: FM270200
        const fmState = new RegExp(/[F][M]\d\d\d\d\d\d/gm)

        //regex for the taf issuance and coverage period: 261720Z 2618/2724
        const cvgState = new RegExp(/\d\d\d\d\d\d[Z]\s\d\d\d\d[/]\d\d\d\d/)

        //match method to return array of all fm statements, then logic to transform it into our desired array... basically functionality to take each fm statement and turn it into a date/time object in our desired array
        let tempFms = this.taf.match(fmState);


        //when testing this... remember... MUST USE CURRENT DATE TAF!!!
        console.log(`array of taf times: ${tempFms}`);

        //if statement added to account for one-line tafs
        //only parses the fm statements if there are any
        //otherwise, just adds the end time (next code block) to the timeIndices array
        if (tempFms) {
            for (let x in tempFms) {


                //scaffolding
                console.log(`sliced date: ${Number((tempFms[x].slice(2, 4)))}`);
                console.log(`currD utc date: ${currD.getUTCDate()}`);
                console.log(`currD utc date plus 1: ${currD.getUTCDate() + 1}`);

                //if fm statement starts today UTC
                //if the taf line starts current day, create utc date object using everything but the hours and minutes of the currD variable
                if (Number((tempFms[x].slice(2, 4))) === currD.getUTCDate()) {

                    //fm statement transformed into utc date/time object
                    //the utc date object is a value of milliseconds from 1/1/1970 so that we can do math on it
                    let tempUtc = Date.UTC((currD.getUTCFullYear()), (currD.getUTCMonth()), (currD.getUTCDate()), ((tempFms[x].slice(4, 6))), ((tempFms[x].slice(6))));

                    //pushing our date/time object into our array
                    timeIndices.push(tempUtc)

                    //can check utc dates by creating new date object with the milliseconds time value passed-in
                    console.log(`TAF date/time added to our array: ${new Date(tempUtc)}`);

                } else if (Number((tempFms[x].slice(2, 4))) === (currD.getUTCDate() + 1)) {
                    //for fm with time in tomorrow's z time

                    //adding one day to the current date to account for new month and/or year, if needed
                    console.log(`currD before one day added: ${currD}`);
                    currD.setDate(currD.getUTCDate() + 1)
                    console.log(`next day date: currD now: ${currD}`);

                    //fm statement transformed into utc date/time object
                    //the utc date object is a value of milliseconds from 1/1/1970 so that we can do math on it
                    let tempUtc = Date.UTC((currD.getUTCFullYear()), (currD.getUTCMonth()), (currD.getUTCDate()), ((tempFms[x].slice(4, 6))), ((tempFms[x].slice(6))));

                    //pushing our date/time object into our array
                    timeIndices.push(tempUtc)

                    //can check utc dates by creating new date object with the milliseconds time value passed-in
                    console.log(`TAF date/time (next utc day) added to our array: ${new Date(tempUtc)}`);
                }
            }
        }


        //match method to return array of taf issuance info, then logic to take taf end time and add it to the end of our desired array
        let tempEnd = this.taf.match(cvgState);
        tempEnd = tempEnd[0].match(/\d\d\d\d[/]\d\d\d\d/)
        tempEnd = tempEnd[0].split('/')

        console.log(`taf cvg info: ${tempEnd}`)

        //index 1 of the tempEnd gives us our TAF end-time
        //logic to make date/time out of it...

        //variable to hold taf ending hr...
        let endingHr = Number(tempEnd[1].slice(2));
        let endingMins = 0;

        //copied the if statment from abv...
        if (Number((tempEnd[1].slice(0, 2))) === currD.getUTCDate()) {

            //logic to take 24 as taf end-time and change it into 2359
            if (endingHr === 24) {

                //change ending times to be 2359
                endingHr = 23;
                endingMins = 59;

                console.log(`TAF end time now 2359!`);
            };

            //fm statement transformed into utc date/time object
            //the utc date object is a value of milliseconds from 1/1/1970 so that we can do math on it
            let tempU = Date.UTC((currD.getUTCFullYear()), (currD.getUTCMonth()), (currD.getUTCDate()), (endingHr), (endingMins));

            //pushing our date/time object into our array
            timeIndices.push(tempU)

            //can check utc dates by creating new date object with the milliseconds time value passed-in
            console.log(`TAF END date/time added to our array: ${new Date(tempU)}`);

        } else if (Number((tempEnd[1].slice(0, 2))) === (currD.getUTCDate() + 1)) {
            //for fm with time in tomorrow's z time

            //adding one day to the current date to account for new month and/or year, if needed
            console.log(`currD before one day added: ${currD}`);
            currD.setDate(currD.getUTCDate() + 1)
            console.log(`next day date: currD now: ${currD}`);

            //logic to take 24 as taf end-time and change it into 2359
            if (endingHr === 24) {

                //change ending times to be 2359
                endingHr = 23;
                endingMins = 59;

                console.log(`TAF with end date tomorrow, end time now 2359!`);
            };

            //fm statement transformed into utc date/time object
            //the utc date object is a value of milliseconds from 1/1/1970 so that we can do math on it
            let tempU = Date.UTC((currD.getUTCFullYear()), (currD.getUTCMonth()), (currD.getUTCDate()), (endingHr), (endingMins));

            //BUG HERE... IF TAF END TIME SHOWS 24TH HOUR, THE LOGIC ABV ADDS 24 HOURS TO THE DATE, RESULTING IN AN EXTRA DAY???
            //I think the logic abv in the issue... regardless, there is a bug here.---fixed!

            //pushing our date/time object into our array
            timeIndices.push(tempU)

            //can check utc dates by creating new date object with the milliseconds time value passed-in
            console.log(`TAF END date/time (next utc day) added to our array: ${new Date(tempU)}`);
        } else if (Number((tempEnd[1].slice(0, 2))) === (currD.getUTCDate() + 2)) {
            //for fm with time in tomorrow's z time

            //adding one day to the current date to account for new month and/or year, if needed
            console.log(`currD before one day added: ${currD}`);
            currD.setDate(currD.getDate() + 2)
            console.log(`next day date: currD now: ${currD}`);

            //logic to take 24 as taf end-time and change it into 2359
            if (endingHr === 24) {

                //change ending times to be 2359
                endingHr = 23;
                endingMins = 59;

                console.log(`TAF with end date tomorrow, end time now 2359!`);
            };

            //fm statement transformed into utc date/time object
            //the utc date object is a value of milliseconds from 1/1/1970 so that we can do math on it
            let tempU = Date.UTC((currD.getUTCFullYear()), (currD.getUTCMonth()), (currD.getUTCDate()), (endingHr), (endingMins));

            //pushing our date/time object into our array
            timeIndices.push(tempU)

            //can check utc dates by creating new date object with the milliseconds time value passed-in
            console.log(`TAF END date/time (next UTC day, 2-days ahead) added to our array: ${new Date(tempU)}`);
        }

        //returned... array output: [(date: 6/27/23 02Z), (date: 6/27/23 10Z), (date: 6/27/23 2359Z)]
        return timeIndices;
    }

    //tafTimes() does not include logic to handle tempo or prob conditions... will need to add that functionality later

    //method to take the taf apart and create taf objects associated with time range keys within the taflines property. set each taf line as taf object to its correct time range array key within the taflines property (which is a map)
    //array that holds the taf objects in sequential order, which would automatically correspond to the fm statment order that we defined in the tafTimes() method
    //dont need taf property passed-in here bc, by definition, this method is for use on the forecast object itself
    fillTafLines() {

        //variable to hold all the taf lines as individual elements in an array, in sequential order
        let lines;

        //the following is all done...
        //use regex to determine number of taf line times and use date module to create an array with indices that correspond to the taf line keys (taf line key 0 would correspond to the first item in the taf line times array. the array could hold, as elements, date objects defining the corresponding taf line time period??? for example, array index 0 would be 6/9 at 02Z. then we could check entered time against each element of the array and whichever element the entered time falls before, would be the correct taf line element for the given time)
        //code line 1797 for notam regex examples...

        //this will be like metarShread() and it will use many of the same functions
        //will add the taf objects (report-like objects) to the tafLines property which is an array

        //first... splitting the taf on the FM statements to get each taf line in an array in sequential order
        lines = this.taf.split('FM');
        console.log(`TAF LINES: ${lines}`);

        //then, using the metarShread functionality to parse each taf lines and to create a taf object to be held within the tafLines property (which is an array)

        for (let q in lines) {

            //cig, vis, wind
            let l = lines[q];
            let c = readCIG(lines[q]);
            let v = readVis(lines[q]);
            let w;
            let vrbWinds;

            //flt category
            let cat = calcCat(c, v);

            //vrb winds...
            let vrWind = lookForVrb(lines[q]);

            //if no vrb winds, then map with normal dir, speed, gust
            //else map with dir---VRB, speed, gust
            if (vrWind === false) {

                //logic for when there is no vrb wind in the taf line
                w = readWind(lines[q]);
                vrbWinds = false
            } else {

                //logic for variable winds in taf... for now, keeping the tailwind logic to avoid breaking code and adding another property to the Taffy object to indiciate VRB winds for the taf line
                w = vrWind;
                vrbWinds = true;
            };

            //creating Taf object for the metar
            let tafLine = new Taffy(l, c, v, w, vrbWinds, cat);

            //pushing object to the map that holds them in the global environment
            this.taflines.push(tafLine);
            console.log(`taflines property, iteration ${q}: ${this.taflines}`);
        }
    }

    //possibly need to make application time a global value???
    //see the notam functions for this value

    //method to take a given number of hrs in the future (0 for current hr) and return the correct taf object that goes with it. taf object is in the same format as the report objects. this is so that we can use them in the getAirportData() function as we iterate through the selected time range for each airport/taf
    outputTaf(timeInt) {

        //need to take, instead of zulu time, an integer for the number of hrs in the future from now, similar to the notam function. then, using an application time value, it needs to determine the time for which we want data and it need to compare this time against the tafTimes property (array of fm statements, along with an end time for the taf valid period)
        //whichever FM statement the time falls before is the valid fm statement for our specified time, and the index number of it should be used to grab the corresponding taf object from the array of them

        //copied the application time code from notamShread()...

        //handling the timeInt argument...
        //if it is zero, take current Z time and get Taf line that is active now
        //if it is 1, take current Z time hour and add the argument to it to get the Z time for which we want active taf line

        //variable to hold the time for which we want active taf line
        let applicationTime;

        //logic to calculate applicationTime (time for which we want the active taf line)
        if (timeInt === 0) {

            //if it is zero, take current Z time and get notams that are active now
            //Date.parse() takes the passed-in time and converts it to milliseocnds since 1-1-1970 JS standard for time
            //allows us to do math with time

            //current date/time
            let tempDate = new Date();

            applicationTime = Date.UTC((tempDate.getUTCFullYear()), (tempDate.getUTCMonth()), (tempDate.getUTCDate()), (tempDate.getUTCHours()), (tempDate.getUTCMinutes()));
            //this logic gives us the taf line at the current time (hours and minutes). the logic for future taf lines gives us the taf line for one minute after each hour (0201Z for the 02Z hour, 0301Z, for the 03Z hr, etc.)

            //converting to UTC

            console.log(`application time: ${applicationTime}`);
        } else if (timeInt > 0) {

            //current date/time
            let tempD = new Date();

            applicationTime = Date.UTC((tempD.getUTCFullYear()), (tempD.getUTCMonth()), (tempD.getUTCDate()), (tempD.getUTCHours()), (1)) + (timeInt * 3600000);
            //3,600,000 milliseconds in an hr. taking that times the number of hrs you want to go in future and adding it to the current UTC time in milliseconds
            //changed minutes to a standard of 1... gives us 0201Z, 0301Z, etc.

            console.log(`FUTURE TAF TIME: ${applicationTime}`);
        } else {
            console.log(`IntendedTime cannot be less than zero!!!`);
        };

        //the abv code determine the time for which we want the valid taf (already in parsed form... milliseconds from 1/1/1970)
        //code below compares this time to each time element in the tafTimes() array and returns the index for which we want taf data
        //the logic...
        //basically, if the fm statement is later in time than the time for which we want taf data, the index of the fm statement is returned as it will correspond to the correct index of the taf object that we want from the taf array
        for (let y in this.tafTimes) {

            if (this.tafTimes[y] > applicationTime) {
                console.log(`TAF object is in element ${y} of the taf object array`);
                console.log(`TAF object output: ${this.taflines[y]}`);
                return this.taflines[y];

                //code here to return the applicable Taffy object from within the taflines array

                //keep in mind, this is returned within the object and is not usable outside of the object and its methods... cannot assign this returned index to a variable outside of the object. so... to get the correct tafline, need to keep all the logic within the object
            }

        }

        //currently, no protection against asking for taf data beyond the taf valid period. in that case, would just fail to return an index... maybe add this later???

    }

}


//defining notam object class... will hold all notam data for each airport
//for now, just holding data on open/closed, closed rwys, ots ils, ots gps
//gps is in there bc we need to test having an empty array or other property value. right now, not even going to add functionality to look for gps outages
class Notam {
    constructor(apt, closed, rwys, ils, gps) {
        this.apt = apt;
        this.closed = closed;
        this.rwys = rwys;
        this.ils = ils;
        this.gps = gps;

    }
}

//END OF CLASS DEFINITIONS
///////////////////////////////////////////////////////////////////////


//function to add the hidden class name to one element while removing it from another
//removes hidden from element one
//adds hidden to element two
function toggleHide(elOne, elTwo) {
    elOne.classList.remove('hidden');
    elTwo.classList.add('hidden');
};


function openProgram() {
    introModal.classList.add('hidden');
};


//callback function to take the info from general click events in the DOM and, depending on what was clicked, to execute different code
//this basically allows us to add functionalty to a dom element that isnt created at the start of the doc...
//need to add id names to each created <th> in the table in getForecastData() if going to add modal functionality to it later
function toSelect(event) {
    let element = event.target
    if (element.tagName === 'TH') {

        alert(`Works!`);

        /*commented below out for now to avoid error...
        //removes hidden class to display the modal
        //id name for the modal data is modal-TH id name
        document.getElementById(`modal-${element.id}`).classList.remove('hidden');

        maybe add this functionality later?

        */
    } else if (element.tagName === 'LI' && element.className === 'm') {

        // element.className === 'metar'

        //the id of the metar text in that goes with the table html code is the airport name (the key in the async function)
        //the if of the modal is "modal-(airport name... the key in the async function)". this is how we match them up to display the correct modal based on the clicked metar text!!!

        document.getElementById(`modal-${element.id}`).classList.remove('hidden');

        //scaffold... this works!!!
        console.log(`Clicked the METAR!`);
        console.log(`the id is: ${element.id}`);

    } else if (element.className === 'modal') {

        //bc the clicked element is the modal that we are trying to hide (same as the selected dom element in the abv if statement), we can just add the hidden class to the event.target (element variable) here
        element.classList.add('hidden');
    } else if (element.tagName === 'IMG' && element.className === 'settings') {

        //when settings icon clicked, code to open settings box for user selection of timeframe for the taf boxes... maybe add this functionality later 

        console.log(`settings icon works!`);

    }
}

//function to hold functionality of reset button
//resets the display to the original and clears the map and the html code from the html output section (id=output)
function resetData() {

    //to remove inserted html code that holds all the report data

    //while loop to iterate through all the elemnents in the ul of reports and to remove all of them. keeps the parent element so that all other code keeps working
    while (metarOutput.hasChildNodes()) {
        metarOutput.removeChild(metarOutput.firstChild);
    };

    //code to clear the textareas (wx and notams)
    textBox.value = '';
    notamBox.value = '';

    //to reset the display elements that are visible/hidden
    toggleHide(userInput, resetButton)

    //code to clear the reports and forecasts map
    reports.clear();
    forecasts.clear();

    //clearing the arrays that hold metar/taf data and notam data
    //all METAR and TAF data strings
    wxArr = [];

    wxInput = '';

    //all METAR data
    wxMETAR = [];

    //all TAF data
    wxTAF = [];

    //airport ids
    aptIds = [];

    //notam data clearing...
    notamD = [];

    notamFDC = [];

    //global time date reset... resetting to current date/time
    d = new Date();

};

//callback function to take the metar and taf data from user input and output an array of individual METAR and TAF elements, then seperates the array into seperate arrays for METAR and TAFs individually, then calls function to parse each METAR and create Report objects containing the parsed data from each METAR
//wxArr global variable holds all the individual METAR and TAF elements
function saveData() {
    wxInput = textBox.value;

    //uses REGEX to split the string input [K] = K and [A-Z] = any character in the range... no whitespace (matches at airport IDs)
    //basically splits on all airport IDs and outputs an array with the METAR and TAF data split up into sepecate strings by airport
    const dataArr = wxInput.split(/[K][A-Z][A-Z][A-Z]/);
    console.log(`dataArr: ${dataArr}`);

    //using the match method with the same REGEX to grab all the airport IDs on which we split. /g tells it to do a global search, finding all the matches. without the /g, it just finds the first one.
    //the match method automatically returns all the matches in an array
    aptIds = wxInput.match(/[K][A-Z][A-Z][A-Z]/g);

    //temporary variable for use with the following for loop...
    let temp = [];

    //creating an array of individual METAR and TAF elements...
    for (let i = 0; i < aptIds.length; i++) {
        temp.push(aptIds[i]);
        temp.push(dataArr[i + 1]);
        let tempAdd = temp.join('');
        wxArr.push(tempAdd);
        temp = [];
    };

    //code below seperates the metars and taf into their own arrays. combined these two functions to simplify code

    //the regular expression for the altimeter setting format
    //learned that must use RegExp constructor to create it
    //global flag not needed bc we are just searching each string for one instance of the regex match
    const regAlt = new RegExp(/[A][0-9][0-9][0-9][0-9]/m);

    //splitting METAR and TAF data from the wxArr into seperate arrays for METAR and TAF data
    //using the for-of loop
    //using "A followed by four numbers" (altimeter setting) in METAR to label it as METAR, else the string is labeled as a TAF
    //using the .test method to use the regex to search the string
    for (const i of wxArr) {
        if (regAlt.test(i)) {
            wxMETAR.push(i);
        } else {
            wxTAF.push(i);
        }
    };


    //code for creating forecast objects here. creates one for each taf/airport that we have
    //forecastCreate() takes the taf string and creates a forecast object. forecast objects are held in forecasts map, just like the report objects are held in the reports map
    //code line 1054 holds this function forecastCreate()
    wxTAF.forEach(forecastCreate);


    //sorting wxMetar array by first letter in airport ID???
    //either pop the k then sort, or sort by index 1?

    //adding functionality to parse each metar in the wxMETAR array and create airport objects to hold the metar data and the parsed elements. all airport objects are stored in the airports array
    wxMETAR.forEach(metarShread);
    console.log(reports);

    //function to display the report data in the UI
    toggleHide(resetButton, userInput);

    //displaying the notam input box...
    //will need to later change this code to keep the airport data hidden until the notam data is taken and parsed
    //for now, displaying the notam input box and the airport data together
    notamInput.classList.remove('hidden');

    //calling the async function to get the data from the server
    //this function now in the notam submit button bc we cant run the async function without notam info (notamShread function is called in the async function)
    // getAirportData();

};


//used the same REGEX to grab all the airport IDs on which we split the wx data and then used a for loop to combine the airport IDs and the METAR and TAF data into individual METAR and TAF elements in an array that holds all of them


//////////////////////////////////////////////////////////////////////
//functions to read CIG, VIS, and wind from METAR
//Report object created with this data

//function that returns CIG height as Number in actual feet AGL...
function readCIG(metar) {
    //search string for BKN or OVC to determine whether or not there is a cloud CIG
    //if there is no CIG, output "None"?
    //if BKN or OVC are found, take the three numbers to the right of the first instance of BKN or OVC, add two zeros to it, then cast it as a number

    //variables to hold regex for BKN and OVC
    const regBkn = new RegExp(/[B][K][N]/);
    const regOvc = new RegExp(/[O][V][C]/);

    //variable to hold the index of the first reported CIG
    let ind = 0;

    //variable to hold CIG height... will be str at first. need to cast into Number
    let cig = 0;

    //variable to hold CIG height as number
    let cigNum = 0;

    //is statement to check for BKN or OVC in string
    if (regBkn.test(metar) || regOvc.test(metar)) {
        // console.log(`CIG`);

        //BKN should always come first, but test for whether BKN or OVC comes first using indexOf() method, if both are in the METAR
        if (regBkn.test(metar) && regOvc.test(metar)) {

            //if both BKN and OVC are in metar and BKN comes first...
            if (metar.indexOf('BKN', 7) < metar.indexOf('OVC', 7)) {
                ind = metar.indexOf('BKN', 7)
                cig = metar.substr((ind + 3), 3);
                // console.log(`BOTH BKN${cig}`);
            } else {
                //if both BKN and OVC are in metar and OVC comes first...
                ind = metar.indexOf('OVC', 7)
                cig = metar.substr((ind + 3), 3);
                // console.log(`BOTH OVC${cig}`);
            }
        } else {
            //if either BKN or OVC are in metar (but not both), then find index of the beginning of BKN, store in variable, then add three to it and grab (substr) from there to that plus two more indexes (ex: index 3-5... three total characters) to grab the CIG height
            //if BKN in metar...
            if (regBkn.test(metar)) {
                ind = metar.indexOf('BKN', 7)
                cig = metar.substr((ind + 3), 3);
                // console.log(`BKN${cig}`);
            } else {
                //if OVC in METAR
                ind = metar.indexOf('OVC', 7)
                cig = metar.substr((ind + 3), 3);
                // console.log(`OVC${cig}`);
            }
        }
    } else {
        cig = 999;
    }

    //convert cig into number and return it in thousands or feet AGL...
    cigNum = Number(cig) * 100

    //returns CIG height AGL or, for no CIG, returns a CIG height of 99,900
    return cigNum;
};

// console.log(readCIG('KDAL 202253Z 34008G19KT 8SM -RA SCT027 SCT048TCU SCT065 SCT250 25/14 A2986 RMK AO2 RAB51 SLP107 OCNL LTGIC CB DSNT SE MOV NE TCU W-N P0000 T02500139'));

//function to read VIS from metar and return it in number statute miles
function readVis(metar) {
    //code here...
    //VIS = (index of K in KT) + 3 to (index of S in SM) - 1


    //the regular expressions for the VIS format
    //includes whole numbers (both two and one digit), fractions, whole + frac (ex: 1 1/2SM), RVR (R04R/P6000FT)
    //for RVR, search for a pattern that starts with capital R and ends with FT[\S+] says match any character other than white space, any number

    //learned that must use RegExp constructor to create it
    //global flag not needed bc we are just searching each string for one instance of the one of the regex matches
    const regWholeTwo = new RegExp(/[0-9][0-9][S][M]/);
    const regWholeOne = new RegExp(/[0-9][S][M]/);
    const regFrac = new RegExp(/[0-9][/][0-9][S][M]/);
    const regWhFrac = new RegExp(/[0-9][\s][0-9][/][0-9][S][M]/);
    // const regRvr = new RegExp(/[^R][0-9][\S+][F][T$]/);

    const regArr = [regWholeOne, regWholeTwo, regFrac, regWhFrac];

    //using search() method with regex as argument, it returns the first index of the match (if any) or -1 if no match
    //index of first character of match = text.search(regex)

    //visStart holds the starting index of the vis string
    let visStart;

    for (let x of regArr) {
        let resNum = metar.search(x)
        if (resNum === -1) {
            continue
        } else {
            visStart = resNum
        }
    }

    //variable to hold VIS in str form
    let visString = 0;

    //variable to hold VIS in Number form
    let visNum = 0;

    //variables to hold starting and ending index of VIS
    // let visStart = 0;
    let visEnd = 0;

    //finding the needed indices
    // visStart = metar.indexOf('KT', 7) + 3;
    visEnd = metar.indexOf('SM', 7);

    //bc the end index of a slice is not included in the slice, no need to adjust the visEnd index
    visString = metar.slice(visStart, visEnd);

    //variable to hold the first number, if any...
    let firstNum = 0;

    //to handle fractions, if they exist in the report...
    //reverse indexing to start at the end of the str, then take the last index and the two indexes before it and split on the / character, then use parseInt() on the split to with index zero divided by index 1 to get result in decimal
    if (visString.includes('/')) {

        //string.length to determine whether or not we need to pull the first character!!!!!
        if (visString.length > 4) {
            //slice from beginning of str to length - 4 to get numbers before fraction...
            firstNum = Number(visString.slice(0, (visString.length - 4)))
        }

        //slicing to take only the fraction
        let frac = visString.slice((visString.indexOf('/') - 1))

        //split on the /... returns array of the two numbers...
        let spFrac = frac.split('/')

        //casting each index of the split array into Numbers and adding the first visiblity number to it. this works bc metar vis never gives fractions above 10 miles.
        visNum = (Number(spFrac[0]) / Number(spFrac[1])) + firstNum;
    } else {
        visNum = Number(visString);
    }

    //returns VIS in SM as int or float (remember, float doesnt exist in JS, just Number type), so basically either integer or decimal VIS number. Returns number only, no SM 
    return visNum;
};


// console.log(readVis('KDAL 202253Z 34008G19KT 1 1/2SM -RA OVC027 SCT048TCU SCT065 OVC250 25/14 A2986 RMK AO2 RAB51 SLP107 OCNL LTGIC CB DSNT SE MOV NE TCU W-N P0000 T02500139'));

//function to read RVR from metar and return it in number FT if present or return false if not present
function readRvr(metar) {
    //code here...
    //VIS = (index of K in KT) + 3 to (index of S in SM) - 1

    //variable to hold to rvr value (false for no rvr, or the rvr value in ft)
    let rvrNum;

    //the regular expressions for the VIS format
    //includes whole numbers (both two and one digit), fractions, whole + frac (ex: 1 1/2SM), RVR (R04R/P6000FT) after VIS
    //for RVR, search for a pattern that starts with capital R and ends with FT[\S+] says match any character other than white space, any number

    //learned that must use RegExp constructor to create it
    //global flag not needed bc we are just searching each string for one instance of the one of the regex matches
    const regRvr = new RegExp(/\bR\d\d\S+FT\b/m);
    // const regRvr = new RegExp(/\b[R][0-9][0-9][\S+][F][T]\b/);

    // const begRvr = new RegExp(/[/][\S+][F][T$]/)

    //using search() method with regex as argument, it returns the first index of the match (if any) or -1 if no match
    //index of first character of match = text.search(regex)

    let resNum = metar.search(regRvr)
    console.log(resNum);

    //if the pattern is present in the metar string, rvrStart, which holds the index of the first character in the rvr string gets assigned (resNum would be -1 if the pattern is not present)
    if (resNum != -1) {

        //visStart holds the starting index of the vis string
        let rvrStart;
        let rvrEnd;

        //variable to hold rvr in str form
        let rvrString = 0;


        //holds the starting index of the rvr value
        rvrStart = resNum;
        console.log(`rvrStart: ${rvrStart}`);

        //finding the needed indices... begins search at first index of rvr value
        rvrEnd = metar.indexOf('FT', rvrStart);
        console.log(`rvrEnd: ${rvrEnd}`);

        console.log(`rvrEnd - 5: ${(metar[(rvrEnd - 5)])}`);

        //variable plus scenario...
        // const vpVar = metar.slice(rvrStart, rvrEnd);
        // console.log(`complete rvr string: ${vpVar}`);

        //need to account for steady rvr R01L/0800FT, variable rvr R01L/0600V1000FT, less than R01L/M0800FT, greater than R01L/P6000FT
        if (metar[rvrEnd - 5] === '/') {
            //to get primary rvr value, need to slice backward to include the four charatcers prior to rvrEnd
            rvrString = metar.slice((rvrEnd - 4), rvrEnd);
        } else if (metar[rvrEnd - 5] === 'V') {
            //logic to capture lowest of the variable rvr values
            rvrString = metar.slice((rvrEnd - 9), (rvrEnd - 5))
        } else if (metar[rvrEnd - 5] === 'P' && metar[rvrEnd - 6] === 'V') {
            //logic to capture lowest of the variable rvr values
            rvrString = metar.slice((rvrEnd - 10), (rvrEnd - 6))
        } else if (metar[rvrEnd - 5] === 'M') {
            //if rvr is less than reportable number, rvrString holds zero as rvr value
            rvrString = 0;
        } else if (metar[rvrEnd - 5] === 'P') {
            //if rvr greater than reportable number, rvrString holds 1 as rvr value
            rvrString = 1;
        }

        //scaffolding...
        console.log(`rvrString: ${rvrString}`);
        console.log(`the whole rvr: ${metar.slice(rvrStart, rvrEnd)}`);

        //casting the string rvr as Number type...
        rvrNum = Number(rvrString);
        console.log(`rvrNum: ${rvrNum}`);


    } else {
        rvrNum = false;
        console.log(`rvrNum: ${rvrNum}`);
    }


    //returns rvr in ft, or returns false if rvr not present in metar
    //if greater than reportable number (normally 6000), returns 1
    //if less than reportable number (lowest reportable rvr) returns 0
    //if variable, returns the lowest variable value
    console.log(rvrNum);
    return rvrNum;
};


// console.log(readRvr('KDAL 202253Z 34008G19KT 1 1/2SM R04R/P6000FT -RA OVC027 SCT048TCU SCT065 OVC250 25/14 A2986 RMK AO2 RAB51 SLP107 OCNL LTGIC CB DSNT SE MOV NE TCU W-N P0000 T02500139'));


//function to look for variable wind and, if it exists, produce a tailwind for all runways
//function returns either a windMap (map showing tailwinds for all rwys) or should return false
function lookForVrb(metar) {
    //code to look for vrb wind and, if present, produce a wind map with dir---'VRB, speed---SS speed KTS, gust---GUST speed KTS

    //defining variable to hold either a map or false boolean
    let vrbData;

    //regex for VRB+any number of characters, then KT
    const vrbWnd = new RegExp(/[V][R][B][0-9][0-9]/);

    //searching the metar with the regex. returns -1 if not there. returns index of beginning of the string if there
    let resId = metar.search(vrbWnd)
    console.log(resId);

    //if vrb wind found in metar...
    if (resId != -1) {

        //making our variable a map
        vrbData = new Map();

        //visStart holds the starting index of the vis string
        let vrbStart;
        let vrbEnd;
        let gust = 0;
        let speed = 0;

        //variable to hold wrb wind in str form
        let vrbString;


        //holds the starting index of the rvr value
        vrbStart = resId;
        console.log(`vrbStart: ${vrbStart}`);

        //finding the needed indices... begins search at first index of rvr value
        vrbEnd = metar.indexOf('KT', vrbStart);
        console.log(`vrbEnd: ${vrbEnd}`);

        //slicing the vrb wind string for reading
        vrbString = metar.slice(vrbStart, vrbEnd);
        console.log(`vrb string: ${vrbString}`);

        //gust, if present is always at end of windString and it always follows G...
        //check if G present... if so, then slice from (index of G + 1) to end
        if (vrbString.includes('G')) {
            gust = Number(vrbString.slice((vrbString.indexOf('G') + 1)))
            speed = Number(vrbString.slice(3, (vrbString.indexOf('G'))))
        } else {
            speed = Number(vrbString.slice(3))
        }

        //speed is always two or max of three numbers, beginning with the fourth digit and ending at the G, if present, or K in KT if G not present... added to the if statement above for simplicity
        //speed = (windString index 3) to either(index of G or index of K)

        //now need to use the set method to add each part of the wind string to our windData map
        vrbData.set('dir', 'VRB').set('speed', speed).set('gust', gust);

    } else {
        vrbData = false;
    }

    //returns map on wind info. for example, for 34008G25: {'dir' => VRB, 'speed' => 8, 'gust' => 25}
    return vrbData;
}


// let tempVar = lookForVrb('KDAL 202253Z VRB08G16KT 1 1/2SM -RA OVC027 SCT048TCU SCT065 OVC250 25/14 A2986 RMK AO2 RAB51 SLP107 OCNL LTGIC CB DSNT SE MOV NE TCU W-N P0000 T02500139');



//function to take the VRB map and the runways array and produce TW for all rwys
function vrbTW(vrbWindMap, rwysArr) {

    //returns map...
    let vrbComp = new Map();

    const vrbSpeed = vrbWindMap.get('speed');
    console.log(vrbSpeed);

    const vrbGust = vrbWindMap.get('gust');
    console.log(vrbGust);

    //remember, format of array values in map is [HW, GUST HW, XW, GUST XW], but will be with negative HW and gust HW. All TW and gust tws for all rwys
    //would be no xw
    //returns map in format (key = rwy number, value: [HW, GUST HW, XW, GUST XW])
    //example map output: {18 => [-3, -4, 0, 0], 36 => [-3, -4, 0, 0]}

    for (let x in rwysArr) {
        vrbComp.set(rwysArr[x], [(-vrbSpeed), (-vrbGust), 0, 0])
    };

    return vrbComp;
};

// let tempVarTwo = vrbTW(tempVar, [13, 31]);
// console.log(tempVarTwo);


//function to read wind from METAR and return direction, speed, and gust
function readWind(metar) {

    //new map created using constructor
    const windData = new Map();

    //variables to hold direction, speed, and gust
    let direction = 0;
    let speed = 0;
    let gust = 0;

    //variable to hold the wind data sliced from the metar as a string
    let windString = '';

    //variables to hold starting and ending index of wind
    let windStart = 0;
    let windEnd = 0;

    //create a map of dir:###, speed:###, gust:##

    //refactoring to use regex to find windStart...
    const regWnd = new RegExp(/[0-9][0-9][0-9][G0-9]+[K][T$]/);

    //searching the metar with the regex. returns -1 if not there. returns index of beginning of the string if there
    let resNumber = metar.search(regWnd)
    console.log(resNumber);

    //using same logic as above to find the wind in the METAR... slicing from (index of the Z at the end of the time data + 2) to (index of the K in KT)

    //using indexOf method, can specify starting index as second argument. starting at index 4 or later will eliminate possibility of including a Z in an airport ID...

    //finding the needed indices
    windStart = resNumber;
    // windStart = metar.indexOf('Z', 7) + 2;
    windEnd = metar.indexOf('KT', resNumber);

    //bc the end index of a slice is not included in the slice, no need to adjust the windEnd index
    windString = metar.slice(windStart, windEnd);

    //need to take the windString apart into its three parts... dir, speed, gust
    //direction is always first three digits...
    direction = Number(windString.slice(0, 3));

    //gust, if present is always at end of windString and it always follows G...
    //check if G present... if so, then slice from (index of G + 1) to end
    if (windString.includes('G')) {
        gust = Number(windString.slice((windString.indexOf('G') + 1)))
        speed = Number(windString.slice(3, (windString.indexOf('G'))))
    } else {
        speed = Number(windString.slice(3))
    }

    //speed is always two or max of three numbers, beginning with the fourth digit and ending at the G, if present, or K in KT if G not present... added to the if statement above for simplicity
    //speed = (windString index 3) to either(index of G or index of K)

    //now need to use the set method to add each part of the wind string to our windData map
    windData.set('dir', direction).set('speed', speed).set('gust', gust);

    //returns map on wind info. for example, for 34008G25: {'dir' => 340, 'speed' => 8, 'gust' => 25}
    return windData;
};

// console.log(readWind('KDAL 202253Z 34013KT 2 1/2SM -RA OVC027 SCT048TCU SCT065 OVC250 25/14 A2986 RMK AO2 RAB51 SLP107 OCNL LTGIC CB DSNT SE MOV NE TCU W-N P0000 T02500139'));


//function to calculate crosswind and headwind for a given runway with current wind from METAR
//bc METAR is true and we need magnetic to get actual crosswind/hw, will carry variation in the airport object or database entry for us in this calculation.

//we take runway info from airport object, with runway info stored in an array with rwy numbers as indexes of the array [18, 36]. with this design, will need to take the rwy numbers X 10 to get the actual rwy heading (magnetic)

// const windInfo = readWind('KDAL 202253Z 10015G25KT 2 1/2SM -RA OVC027 SCT048TCU SCT065 OVC250 25/14 A2986 RMK AO2 RAB51 SLP107 OCNL LTGIC CB DSNT SE MOV NE TCU W-N P0000 T02500139');
// const airportOne = [18, 36];

//what this function's returned map looks like: {'dir' => 340, 'speed' => 8, 'gust' => 25}

//function to calculate HW/XW component and output it in a map
function calcWind(windMap, rwyArray) {

    //variable to hold array of runway headings
    let rwyHeads = [];

    //map to hold the angle in degrees between the wind vector and each rwy (key: runway number, value: angle in degrees betwen rwy and wind)
    let angleDeg = new Map();

    //map to hold the angle in radians between the wind vector and the rwy (key: runway number, value: angle in radians betwen rwy and wind)
    let angleRad = new Map();

    //map to hold HW and XW for a given runway (key: runway number, values: [HW in KTS, XW in KTS])
    let windComp = new Map();


    //crosswind speed = wind speed X sin(a)
    //headwind speed = wind speed X cos(a)
    // a = angle between the magnetic wind vector and the runway magnetic heading

    //can use Math.sin(a) and Math.cos(a) for this...
    //they both expect a in radians... need to convert the angle in degrees to the angle in radians first...
    //degrees to radians = (angle in degrees)(PI/180)

    //first need to convert numbers in rwyArray from runway numbers to magnetic headings (rwy numbers * 10)
    //using for in loop...
    for (const x in rwyArray) {
        rwyHeads.push(rwyArray[x] * 10);
    }

    //so... first calculate angle in degrees between the rwys and the wind vector... for loop to calculate the angles for all runways???
    //this angle will sometimes show more than 90 degrees even though it isnt necessary... ex: wind 05025KT, rwy 36 shows angle of 310 instead of 50 degrees... both numbers give us the same result
    for (const x in rwyHeads) {
        angleDeg.set(rwyArray[x], Math.abs(((windMap.get('dir')) - (rwyHeads[x]))))
    }

    //then convert the angle from degrees to radians
    //degrees to radians = (angle in degrees)(PI/180)
    //basically just need to take each value in the map times (PI/180)
    for (const [x, y] of angleDeg) {
        angleRad.set(x, (y * ((Math.PI) / 180)))
    }

    //then do the steady-state HW/XW calculations with the JS Math functions

    //headwind and crosswind calculation for each rwy...
    //headwind speed = wind speed X cos(a)
    //crosswind speed = wind speed X sin(a)
    // a = angle between the magnetic wind vector and the runway magnetic heading
    for (const [x, y] of angleRad) {

        //HW
        let hw = windMap.get('speed') * (Math.cos(y))

        //peak gust HW
        let gustHw = windMap.get('gust') * (Math.cos(y));

        //XW
        //did absolute value here to keep angle measuring code simple...
        //to avoid having to code angle measuring a certain direction (cc or clockwise), which would make positive or negative value here relevant to the direction of the crosswind, just going to take the crosswind as a positive value all the time and going to implement code later for the direction (R or L) of the crosswind relative to the rwy approach direction
        let xw = Math.abs(windMap.get('speed') * (Math.sin(y)))

        //peak gust xw
        let gustXw = Math.abs(windMap.get('gust') * (Math.sin(y)));

        //logged rounded numbers for ease of reading them
        // console.log(Math.round(hw), Math.round(gustHw), Math.round(xw), Math.round(gustXw));

        //add direction for xw? later???

        //note: negative number in hw signifies a TW
        //this works for hw bc cos of theta is positive for theta of (0, 90) and (270, 360)
        //theta is negative for theta of (90, 270)
        //no matter which direction you measure the angle, clockwise or cc, you will get a positive number for hw and a negative number for tw

        //added rounding for all HW and XW values when adding to the map
        windComp.set(x, [Math.round(hw), Math.round(gustHw), Math.round(xw), Math.round(gustXw)]);
    }

    //remember, format of array values in map is [HW, GUST HW, XW, GUST XW]. 
    //returns map in format (key = rwy number, value: [HW, GUST HW, XW, GUST XW])
    //example map output: {18 => [3, 4, 15, 25], 36 => [-3, -4, 15, 25]}
    return windComp;

};

// console.log(calcWind(windInfo, airportOne));


//method to determine current flight category (VFR, IFR, etc.)
//returns sting with flight category given
//flight category not defined as a property bc this method can just be called when flight cat output is needed

function calcCat(c, v) {
    //LIFR = CIG < 500 and/or VIS < 1
    //IFR = CIG 500 >= 1000 and/or VIS 1 > 3
    //MVFR = CIG 1000 - 3000 and/or VIS 3-5
    ///VFR = CIG > 3000 AND VIS > 5

    //variables to hold category for each cig and vis
    let catCig = '';
    let catVis = '';

    //if statements to determine category for cig
    if (c > 3000) {
        catCig = [4, 'VFR']
    } else if (c >= 1000) {
        catCig = [3, 'MVFR']
    } else if (c >= 500) {
        catCig = [2, 'IFR']
    } else {
        catCig = [1, 'LIFR']
    };

    //if statements to determine category for vis
    if (v > 5) {
        catVis = [4, 'VFR']
    } else if (v >= 3) {
        catVis = [3, 'MVFR']
    } else if (v >= 1) {
        catVis = [2, 'IFR']
    } else {
        catVis = [1, 'LIFR']
    }

    //logic to detemine overall flight category between the cig/vis
    if (catCig[0] < catVis[0]) {
        return catCig[1]
    } else {
        return catVis[1]
    };

    //so this returns a string with the flight category value

};

///////////////////////////////////////////////////////////////////////
//ASYNC FUNCTION

//fetch to make http request to node server on localhost port 3001 (server.js)
//.json method parses the json string into JS object
//second .then() allows us to access the data and process it, then display it
function getAirportData() {
    fetch('http://localhost:3001/').then(function (response) {
        console.log(response);
        return response.json();
    }).then(function (data) {
        console.log(data);

        // let apts = reports.keys();
        // console.log(apts);

        reports.forEach(function (v, k) {
            for (let i in data) {
                // console.log(data[i].apt);
                if (data[i].apt === k) {
                    console.log('found!');

                    //if the objects match up, execute the functions below

                    //for the notam function... airport id would be data[i].apt
                    //notam code here...
                    let notamImpact = notamShread(data[i].apt, notamD, 0);
                    console.log(notamImpact);

                    //rwys is a map of runway numbers in use (array), hw/xw component for them (array) corrected for variation, runway numbers of opposite config (array) 
                    let rwys = calcRwy(v, data[i]);
                    console.log(`rwys map: ${rwys}`);


                    //tested is an array of all of the favored rwys/approaches that are in limits
                    let tested = testWinds(v, rwys);
                    console.log(`all favored rwys: ${tested}`);

                    //below gives us hw/xw for each favored rwy
                    //output is in an array that contains strings
                    // for (let x in tested) {
                    //     console.log(`hw/xw for ${tested[x]}: ${rwys.get(`${tested[x]}`)}`);
                    // }
                    //wrote function for the abv...
                    let allWind = hwXw(tested, rwys, data[i], notamImpact);
                    console.log(`FAVORED AFTER NOTAM CUTS: ${allWind}`);

                    //avail is a map of actual runway numbers for favored rwy(s) and opp config rwy(s). the runway numbers are contained in arrays
                    let avail = availRwy(tested, rwys, data[i], notamImpact);
                    console.log(`AVAIL: ${avail}`);

                    //vartiables to hold actual rwy numbers in strings
                    let favoredRwys = avail.get('favored rwys');
                    let oppositeRwys = avail.get('opp config');

                    console.log(`FAV: ${favoredRwys}`);

                    //handling situations where the airport is clsd by notam (all rwys clsd)...
                    //both favoredRwys and oppositeRwys would be empty arrays in this situation
                    //if statement here to continue with calculations if both favoredRwys or oppositeRwys are arrays with data, else tell user airport is clsd
                    if (favoredRwys.length != 0 && oppositeRwys.length != 0 && notamImpact.get('CLSD') != true) {

                        console.log(`favored rwy numbers: ${favoredRwys}`);
                        console.log(`opp config rwy numbers: ${oppositeRwys}`);

                        //determining available cat i ils or gps
                        let approachAvail = availApp(favoredRwys, data[i], notamImpact);
                        let approachOpp = availApp(oppositeRwys, data[i], notamImpact);

                        console.log(`favored ils: ${approachAvail}`);
                        console.log(`opp ils: ${approachOpp}`);

                        //need to add function to determine approach mins if there are any ils available...
                        //if no ils, print string reference gps mins
                        let minsFav = ldgMins(approachAvail, data[i]);
                        let minsOpp = ldgMins(approachOpp, data[i]);

                        console.log(`favored mins: ${minsFav}`);
                        console.log(`opp mins: ${minsOpp}`);

                        //bc minsFav can be a string instead of an array (when there are no ils available), if statement here to convert it to an array if it's not one already. then the join method will work as designed in the html code...
                        let modMinsFav = [];
                        let modMinsOpp = [];

                        if ((typeof minsFav) === "string") {
                            modMinsFav.push(minsFav)
                            console.log(`String to array (FAV)! ${modMinsFav}`);
                        } else {
                            modMinsFav = minsFav;
                        }

                        if ((typeof minsOpp) === "string") {
                            modMinsOpp.push(minsOpp)
                            console.log(`String to array (OPP)! ${modMinsOpp}`);
                        } else {
                            modMinsOpp = minsOpp;
                        }

                        let html = `<div class="modal hidden" id='modal-${k}'><li class="modal-content">
                        <h2 class="airport-name">${v.id}</h2>
                        <div class="wx-info">
                            <span class="metar"><strong>${v.metar}</strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="category">WX CATEGORY: <strong> ${v.fltCat} </strong></span>
                        </div>
                        <div class="wx-info">
                            <span>WIND-FAVORED RUNWAYS: <strong id="rwy"> ${favoredRwys.join(' ')} </strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="windspd">HW/XW COMPONENTS: <strong>  <br> ${allWind.join('<br>')} </strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="mins">CURRENTLY ABOVE LANDING MINS?<strong> </strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="app">AVAILABLE APPROACHES: <strong><br> ${approachAvail.join('<br>')} </strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="app">AVAILABLE APPROACHES OPPOSITE CONFIG: <strong><br> ${approachOpp.join('<br>')} </strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="mins">LANDING MINS WITH AVAILABLE APPROACHES: <strong><br> ${modMinsFav.join('<br>')} </strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="mins">LANDING MINS ON OPPOSITE CONFIG: <strong><br> ${modMinsOpp.join('<br>')} </strong></span>
                        </div>
                        </li>
                        </div>
                        <div id=taf-boxes-${k} class=hidden></div>
                        <table id=tb-${k}></table>`;

                        //afterbegin makes the html the first child each time it inserts it
                        metarOutput.insertAdjacentHTML('afterbegin', html);

                        //the abv code is executed for each element in the reports map. it matches the report element with the airport object and then performs the abv functions.

                    } else if (notamImpact.get('CLSD') === true) {

                        let html = `<div class="modal hidden" id='modal-${k}'><li class="modal-content">
                        <h2 class="airport-name">${v.id}</h2>
                        <div class="wx-info">
                            <span class="metar"><strong>${v.metar}</strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="category">WX CATEGORY: <strong> ${v.fltCat} </strong></span>
                        </div>
                        <div class="wx-info">
                            <h1><strong>AIRPORT CLOSED. <br> SEE NOTAMS</strong></h1>    
                        </div>
                        </li>
                        </div>`;

                        //afterbegin makes the html the first child each time it inserts it
                        metarOutput.insertAdjacentHTML('afterbegin', html);

                        //the abv code is executed for each element in the reports map. it matches the report element with the airport object and then performs the abv functions.

                    } else {

                        //code to indicate no rwys available... airport basically clsd by NOTAM

                        let html = `<div class="modal hidden" id='modal-${k}'><li class="modal-content">
                        <h2 class="airport-name">${v.id}</h2>
                        <div class="wx-info">
                            <span class="metar"><strong>${v.metar}</strong></span>
                        </div>
                        <div class="wx-info">
                            <span class="category">WX CATEGORY: <strong> ${v.fltCat} </strong></span>
                        </div>
                        <div class="wx-info">
                            <h1><strong>NO RUNWAYS AVAILABLE. <br> AIRPORT IS EFFECTIVELY CLOSED BY NOTAM. <br> SEE NOTAMS</strong></h1>    
                        </div>
                        </li>
                        </div>`;

                        //afterbegin makes the html the first child each time it inserts it
                        metarOutput.insertAdjacentHTML('afterbegin', html);

                        //the abv code is executed for each element in the reports map. it matches the report element with the airport object and then performs the abv functions.

                    }


                }
            }
        })
    })
};

//END OF ASYNC FUNCTION
//the async function takes the reports map and the notamD array as arguments (basically, even though they are not reqd arguments they way the function is written) and determines all information based on those things, along with the airport object from the server

//an async function for forecasted wx would do the same thing, just taking a TAF map and the notamD array as arguments, alongside the airport info from the server
//the notamShread function would need to be able to take the current hour (already global variable) as an argument and then determine notam applicability based on it???
//function in the 
///////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////
//FUNCTION TO PARSE THE METARS

//function to use all parsing functions to parse each metar, create report objects from them, and add them to a reports map
function metarShread(metar) {

    //in case errant whitespace around metar, trimming it
    let report = metar.trim();

    //calling parsing functions with variables for use in defining the airport object

    //parse out the airport id
    let airportId = report.slice(0, 4);

    //parsing metar
    let cig = readCIG(report);
    let vis = readVis(report);
    let rvr = readRvr(report);
    let wind;

    //determining flt category for the METAR
    let wxCat = calcCat(cig, vis);

    //looking for variable winds
    let varWind = lookForVrb(report);

    //if no vrb winds, then map with normal dir, speed, gust
    //else map with dir---VRB, speed, gust
    if (varWind === false) {
        wind = readWind(report);
    } else {
        wind = varWind;
    };

    //creating airport object for the metar
    let airportWx = new Report(airportId, report, cig, vis, rvr, wind, wxCat);

    //pushing object to the map that holds them in the global environment
    reports.set(airportId, airportWx);

};

// metarShread('KDAL 202253Z 10015G25KT 2 1/2SM -RA OVC027 SCT048TCU SCT065 OVC250 25/14 A2986 RMK AO2 RAB51 SLP107 OCNL LTGIC CB DSNT SE MOV NE TCU W-N P0000 T02500139');

//END OF METAR PARSING FUNCTION
///////////////////////////////////////////////////////////////////////

//FUNCTION TO CREATE FORECAST OBJECTS... called within the saveData() function... called on each index of the wxTAF array
function forecastCreate(taf) {

    //regex to find the airport id
    let aptId = (taf.match(/[K][A-Z][A-Z][A-Z]/)[0]);

    //taking the whole taf string and assigning it to the taf property of the Forecast object as well. creating the object
    let airportTaf = new Forecast(aptId, taf)

    //running the fillTafLines() method on each created forecast object, as it is created
    //this fills the taflines property within the object, creating Taffy objects (similar to report objects) for each line of the taf
    airportTaf.fillTafLines();

    //adding the forecast objects to the forecasts map
    forecasts.set(aptId, airportTaf);
};


///////////////////////////////////////////////////////////////////////
//COMPLETED TASKS

//account for VRB winds and for RVR in the METAR!!!... refactored all previous functions to use regex

//next steps... see beginning of function-building at the bottom
//5/6/23... building functions to execute within the async stream
//build functions to calculate the rest of the data display
//can connect db to server with knex or can use txt file for now
//will use txt file for now
//then implement all funcitonality within async/await function, all further calculations within the async stream

//functions needed...
//function to use hw/xw component and determine which runways likely in use (which rwys within wind limits and favored by wind)
//with the hw/xw component, will have to iterate through the array of parallels after the calculation is done via the original function and will need to display the components for the parallels that are the result of the iteration (if there are parallels)

//function to determine available approach (either ils or tell user that GPS only available)
//if available approach is ils, determine landing mins
//function to determine available approach with inverse winds (opp config) and, if avail approach is ils, to determine landing mins


//END OF COMPLETED TASKS
///////////////////////////////////////////////////////////////////////

//NEED TO CREATE... EVENTUALLY
//interface and design for saving airport data/updating airport data to server... use database or CSV file or form entry interface to save airport info on server

///////////////////////////////////////////////////////////////////////
//dummy object for use in testing functions

const airportObj = {
    "apt": "KDAL",
    "runways": [13, 31],
    "parallels": ["13L", "13R", "31L", "31R"],
    "ilsMins": [["13L", 0.5], ["13R", 0.5], ["31L", 0.75], ["31R", 0.75]],
    "hgsMins": [["13L", 0.25, 600], ["13R", 0, 0], ["31L", 0, 0], ["31R", 0.25, 600]],
    "variation": -3,
    "gpsMins": [["13L", "Y"], ["13R", "Y"], ["31L", "Y"], ["31R", "Y"]]
};

///////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////
//functions to execute within the async stream


//function to use hw/xw component and determine which runways likely in use (which rwys favored by wind, opp config, and wind comp for favored rwys)
//w = hw/xw map (Report.wind), r = runways property array from JSON object (JSON.runways), p = parallels property from JSON object (JSON.parallels), v = (JSON.variation)
//will use the calcWind function within this function... calculates hw/xw
//returns max of two current-use rwys. if no wind, returns first two runways in runway array as default

function calcRwy(reportObject, airportObject) {

    //variable to hold the returned map
    let rwyData = new Map();

    //variable to hold favored rwy(s)
    let favRwy = [];

    //variable to hold opp config runways
    let oppRwy = [];

    //if no variable winds in metar...
    if (((reportObject.wind).get('dir')) != 'VRB') {

        //adjusting for airport-specific variation from JSON object
        //taking the direction from the wind property of the Report object and adding or subtracting the variation
        let varCorrect = (((reportObject.wind).get('dir')) + airportObject.variation);

        let newWind = reportObject.wind;
        newWind.set('dir', varCorrect);
        console.log(newWind);

        //variable to hold hw/xw component map for each runway
        let winds = calcWind(newWind, airportObject.runways);
        console.log(winds);

        //determining which runway are favored by winds (have hw)
        //if the first number in the array that correcponds to the rwy number is positive, it has hw. if negative, has tw. so, using this logic to determine favored rwy(s)
        //for/of loop

        for (let [i, j] of winds) {
            if ((winds.get(i)[0]) > 0) {
                favRwy.push(i)
            } else {
                continue
            }
        };
        if (favRwy.length === 0) {
            favRwy.push(airportObject.runways[0])
        };
        console.log(`fav: ${favRwy}`);

        //need to add code to change single digit rwy numbers to two digits with leading zero... actually need to change other code to add leading zero when needed!!! dont want to change the number here


        //determining rwy numbers of oposite config
        for (let [i, j] of winds) {
            if ((winds.get(i)[0]) < 0) {
                oppRwy.push(i)
            } else {
                continue
            }
        };
        console.log(`opp: ${oppRwy}`);


        //adding data to the returned map...
        //adding favored rwy and opposite config to the map...
        rwyData.set('fav', favRwy).set('opp config', oppRwy)

        //iterating through the favored rwy(s) to add the wind components to the map
        for (let x in favRwy) {
            rwyData.set(`${favRwy[x]}`, (winds.get(favRwy[x])))
        }
    } else {

        //returns map in format (key = rwy number, value: [HW, GUST HW, XW, GUST XW])
        //example map output: {18 => [-3, -4, 0, 0], 36 => [-3, -4, 0, 0]}

        let twAll = vrbTW(reportObject.wind, airportObject.runways);

        //bc in the case of vrb winds all rwys have tw, just default favored rwy to the first rwy in the runways array from the airport object
        favRwy.push(airportObject.runways[0])

        //determining opp config rwys. slicing from index 1 to the end of the runways array to grab the rest of the rwy numbers
        oppRwy.push((airportObject.runways).slice(1));


        //adding data to the returned map...
        //adding favored rwy and opposite config to the map...
        rwyData.set('fav', favRwy).set('opp config', oppRwy)

        //iterating through the favored rwy(s) to add the wind components to the map
        for (let x in favRwy) {

            let u;
            //add code to make all single digit rwy numbers two digits
            if (favRwy[x] < 10) {
                u = String("0" + favRwy[x])
            } else {
                u = String(favRwy[x]);
            }

            rwyData.set(`${u}`, (twAll.get(favRwy[x])))
        };

    }


    //returns map of WIND-FAVORED runway numbers (FAV: [ARRAY]) in use (KEY), hw/xw component for them (MAP, KEY: TWO DIGIT RWY NUMBER STRING: HW/XW [HW, GUST HW, XW, GUST XW]) corrected for variation, runway numbers of opposite config (array) ('OPP CONFIG': [ARRAY])
    //returns max of two current-use rwys. if no wind, returns first runway number in runway array as default
    console.log(rwyData);
    return rwyData;
}

//function to look at map with runways in use from the calcRwy function and their hw/xw components and test them against the hx/xw limits...
function testWinds(reportObject, rwyMap) {

    let inLimits = [];

    for (let x in (rwyMap.get('fav'))) {

        let fav = (rwyMap.get('fav')[x]);
        console.log(fav);

        //variable holds the hw/xw array[HW, gust HW, XW, gust XW]
        let test = rwyMap.get(`${(rwyMap.get('fav')[x])}`)
        console.log(`Test: ${test}`);

        //variable to hold legal or illegal status of the rwy
        let legal = true;

        //code to test the winds against wind limits...
        //using while loop while (legal)... breaking out of the loop if/when legal becomes false (if a limit is busted)

        //remember, format of array values in wind comp output is [HW, GUST HW, XW, GUST XW]. 
        //test = [HW, GUST HW, XW, GUST XW] for the current rwy

        //testing

        while (legal === true) {

            //15KT peak gust TW limit
            if (test[1] <= -16) {
                legal = false;
            }

            //wind caution or MAX wind exceeded alert
            if ((((reportObject.wind).get('speed')) > 60) || (((reportObject.wind).get('gust')) > 80)) {

                //steady-state > 60KTS and/or peak gust > 80KTS
                //remove hidden class from the MAX WIND alert text
                legal = false;

            } else if ((((reportObject.wind).get('speed')) > 30) && (((reportObject.wind).get('gust')) > 40)) {

                //steady-state wind > 30KTs and gust > 40KTS
                //remove hidden class from the CAUTION WIND alert text
                //code to add CAUTION wind alert

            }

            //XW limits...

            if (reportObject.vis >= 0.75) {
                if (reportObject.rvr === false || reportObject.rvr === 1 || reportObject.rvr >= 4000) {
                    //40KT steady XW limit applies
                    if (test[2] >= 41) {
                        legal = false;
                    }
                } else {
                    //20KT steady XW limit applies
                    if (test[2] >= 21) {
                        legal = false;
                    }
                };
            } else {
                //20KT steady XW limit applies
                if (test[2] >= 21) {
                    legal = false;
                };
            };

            //if all within limits, add the rwy to the inLimits array
            //else, if out of limits for any rwy/approach, do nothing
            //if the loop makes it this far, all tests good and we add the rwy number to the inlimits array
            inLimits.push(fav);
            break
        };

    };

    //return inLimits array (holds all rwys/approaches that are in limits)
    console.log(inLimits);
    return inLimits;

    //defaults to 5-good... 40KT steady-state xw limit unless VIS less than 3/4SM/4000RVR, then 20KT steady-state xw limit
    //currently no functionality for braking action xw limits
    //15KT peak gust TW limit

    //////////////////////////////////////////
    //NEED TO DO...
    //caution output needed for steady-state winds near 30KTS, with higher gusts!!!
    //maybe add note that max wind velocity for takeoff and landing is 60KTS steady, 80KTS peak gust
    //toggles (hides/unhides) wind warning text in UI
    //////////////////////////////////////////

};

//LATER... EVENTUALLY....
//did not add code to check for HGS limits yet...
//max HGS hw component could be 30KTS steady-state
//look for RVR to test this


//function to take the returned array from testWinds() (all legal rwys in use) and to take the oppRwy value from the calcRwy function (rwyMap.get('opp config)), to iterate through the array of RWYS in the airport object
function availRwy(lglArr, rwyMap, airportObject, notamImp) {

    let opp = (rwyMap.get('opp config'));
    console.log(`opp: ${opp}`);

    //map to hold all data (rwysUsed: [], oppRwys: [], individual rwy: minsSM or 'GPS only')
    let actRunwayMap = new Map();

    //variables to hold actual rwy numbers (13L, etc.)
    let rwyUsed = [];
    let rwyOpp = [];

    //problem here... if rwy not a parallel, it is left out of this...

    //add iteration to create array of actual rwys in use and opp config rwys actual numbers (ex: from [13, 31] create [13L, 13R, 31L, 31R])

    for (let a in lglArr) {

        let trip = false;
        let b = '';
        //if rwy number less than 10, adding leading zero to the string to match the db rwy numbers
        if (lglArr[a] < 10) {
            b = String("0" + lglArr[a])
        } else {
            b = String(lglArr[a]);
        }

        for (let x in airportObject.parallels) {
            console.log((airportObject.parallels[x]).slice(0, 2));
            if (b === (airportObject.parallels[x]).slice(0, 2)) {

                trip = true;
                rwyUsed.push((airportObject.parallels[x]))
            } else {
                continue
            }
        }

        //checking for rwy not in the parallels
        if (trip === false) {
            rwyUsed.push(b)
        }
    };

    console.log(`rwyUsed: ${rwyUsed}`);


    for (let a in opp) {

        let tripping = false;
        let b = '';
        //if rwy number less than 10, adding leading zero to the string to match the db rwy numbers
        if (opp[a] < 10) {
            b = String("0" + opp[a])
        } else {
            b = String(opp[a]);
        }

        for (let x in airportObject.parallels) {
            console.log((airportObject.parallels[x]).slice(0, 2));
            if (b === (airportObject.parallels[x]).slice(0, 2)) {

                tripping = true;
                rwyOpp.push((airportObject.parallels[x]))
            } else {
                continue
            }
        }

        //checking for rwy not in the parallels
        if (tripping === false) {
            rwyOpp.push(b)
        }
    };

    console.log(`rwyOpp: ${rwyOpp}`);

    //notam impact can go here... adjust the string rwy numbers that are contained in the rwyUsed and rwyOpp arrays
    //basically, if any element in notamImpact.get('RWYS) (which is an array of clsd rwys) matches an element in either of the arrays here, it need to get removed from the array here bc the rwy is clsd
    let clsdRwys = notamImp.get('RWYS');

    if (clsdRwys != []) {
        for (let q in clsdRwys) {
            for (let w in rwyUsed) {
                if (rwyUsed.indexOf(clsdRwys[q]) === -1) {
                    continue
                } else {
                    console.log(`REMOVING CLSD FAV RWY: ${rwyUsed[rwyUsed.indexOf(clsdRwys[q])]}`);

                    //code to remove the closed rwy string from the rwyUsed array
                    rwyUsed.splice(rwyUsed.indexOf(clsdRwys[q]), 1)
                }
            }
        }
        for (let q in clsdRwys) {
            for (let w in rwyOpp) {
                if (rwyOpp.indexOf(clsdRwys[q]) === -1) {
                    continue
                } else {
                    console.log(`REMOVING CLSD OPP RWY: ${rwyOpp[rwyOpp.indexOf(clsdRwys[q])]}`);

                    //code to remove the closed rwy string from the rwyUsed array
                    rwyOpp.splice(rwyOpp.indexOf(clsdRwys[q]), 1)
                }
            }
        }

    }

    console.log(`AFTER NOTAM CUTS: RWY-USED: ${rwyUsed}`);
    console.log(`AFTER NOTAM CUTS: RWY-OPP: ${rwyOpp}`);

    //add the abv two to the map
    actRunwayMap.set('favored rwys', rwyUsed).set('opp config', rwyOpp);

    //returns a MAP "favored rwys" --> ["13L", "13R"], "opp config" --> ["31L", "31R"] (the rwy numbers in the array are strings)
    return actRunwayMap;
}

//function to determine available approaches for the runways in use and for the opp config
function availApp(arrOfRwyNums, airportObject, notamImp) {

    //variable to hold array of available ils and mins
    let app = [];
    let gps = [];

    //code for available approaches here
    //determining available cat i ils or gps
    for (let n in arrOfRwyNums) {
        for (let m in airportObject.ilsMins) {
            if (airportObject.ilsMins[m][0] === arrOfRwyNums[n]) {
                app.push(`ILS ${airportObject.ilsMins[m][0]}`)
            }
        }
        if ((airportObject.gpsMins).indexOf(arrOfRwyNums[n]) >= 0) {
            gps.push(`GPS ${arrOfRwyNums[n]}`)
        }
    }

    console.log(`ILS AVAILABLE:::${app}`);
    console.log(`GPS AVAILABLE:::${gps}`);


    //notam adjustment here!
    //notam impact can go here... adjust the string rwy numbers that are contained in the rwyUsed and rwyOpp arrays
    //basically, if any element in notamImpact.get('RWYS) (which is an array of clsd rwys) matches an element in either of the arrays here, it need to get removed from the array here bc the rwy is clsd
    let clsdIls = notamImp.get('ILS');


    if (clsdIls != []) {
        for (let q in clsdIls) {
            for (let w in app) {
                if (app.indexOf(clsdIls[q]) === -1) {
                    continue
                } else {
                    console.log(`REMOVING CLSD ILS: ${app[app.indexOf(clsdIls[q])]}`);

                    //code to remove the closed rwy string from the rwyUsed array
                    app.splice(app.indexOf(clsdIls[q]), 1)
                }
            }
        }
    };

    console.log(`APP AFTER CLSD ILS REMOVED: ${app}`);

    //if there is an ils available, it is returned. otherwise, gps approaches are returned
    //returns array of two digit rwy numbers in string form ["ILS 13l", "ILS 13R"]
    if (app.length > 0) {
        return app;
    } else {
        return gps;
    }
};


//function to determine app mins for each approach
function ldgMins(calcAvailApp, airportObject) {

    if (Boolean(calcAvailApp[0]) === false) {
        return `No ILS or RNAV approaches available. See approach plates and NOTAMs for any available VOR, VOR/DME, or LOC approaches.`
    } else if (calcAvailApp[0][0] === 'G') {
        return 'RNAV approaches are available. See approach plates and NOTAMs for applicable minimums'
    } else {

        //variable to hold array of available ils and mins
        let ldgFav = [];

        //instead of adding notam impact here, going to try to just take the data returned from availApp and remove the ILS within the string of each rwy so that it can be used in place or arrOfRwyNums
        let onlyRwyNums = [];

        for (let c in calcAvailApp) {

            //using search method to determine index of where rwy number starts in each string within the calcAvailApp array
            //then pushing the sliced string (from there to the end) to onlyRwyNums array
            //onlyTRwyNums array holds strings of just the available ils and can be used in place of arrOfRwyNums
            let rInd = calcAvailApp[c].search(/\d\d[A-Z]?/)
            onlyRwyNums.push(calcAvailApp[c].slice(rInd))
        }

        console.log(`ONLY RWY NUMS ARRAY: ${onlyRwyNums}`);

        //conversion from common decimal approach mins to fractions for better user experience

        //code for available approaches here
        //determining available cat i ils approach mins for all open rwys...
        for (let n in onlyRwyNums) {
            for (let m in airportObject.ilsMins) {
                if (airportObject.ilsMins[m][0] === onlyRwyNums[n]) {

                    let dec = 0;

                    //convert from common dec to fractions for iap mins
                    dec = (airportObject.ilsMins[m][1]);
                    if (dec === 0.5) {
                        dec = '1/2'
                    } else if (dec === 0.75) {
                        dec = '3/4'
                    } else if (dec === 1.25) {
                        dec = '1 1/4'
                    } else if (dec === 1.5) {
                        dec = '1 1/2'
                    } else if (dec === 1.75) {
                        dec = '1 3/4'
                    } else if (dec === 2.25) {
                        dec = '2 1/4'
                    } else if (dec === 2.5) {
                        dec = '2 1/2'
                    } else if (dec === 2.75) {
                        dec = '2 3/4'
                    } else if (dec === 3.25) {
                        dec = '3 1/4'
                    } else if (dec === 3.5) {
                        dec = '3 1/2'
                    } else if (dec === 3.75) {
                        dec = '3 3/4'
                    }

                    console.log(dec);

                    ldgFav.push(`ILS ${airportObject.ilsMins[m][0]}: ${dec}SM`)
                } else {
                    continue
                }
            }
        }

        console.log(ldgFav);

        //for available ils, it returns an array contiaining strings 'ILS RWY_NUMBER: 1/2SM', ETC. otherwise, gps approach note is returned
        if (ldgFav.length > 0) {
            return ldgFav;
        } else {
            return 'Error!';
        }
    }

    //returns array of strings with the ILS and the mins ["13L: 0.5SM"] or returns string that states either no ILS/RNAV available, or that RNAV are available

};

//function to give us an array of hw/xw for each legal rwy
//rwyArray is array of legal rwys in number form [13, 31]
function hwXw(rwyArray, rwyMap, airportObject, notamImp) {

    console.log(`rwy array: ${rwyArray}`);

    //variable to hold actual rwy numbers (13L, etc.)
    let rwysWithWind = [];

    //adding iteration to create array of actual rwys in use and opp config rwys actual numbers (ex: from [13, 31] create [13L, 13R, 31L, 31R])

    for (let a in rwyArray) {

        let trip = false;
        let b = '';
        //if rwy number less than 10, adding leading zero to the string to match the db rwy numbers
        if (rwyArray[a] < 10) {
            b = String("0" + rwyArray[a])
        } else {
            b = String(rwyArray[a]);
        }

        //for loop adds parallels and their winds to the rwysWithWind array
        for (let x in airportObject.parallels) {
            console.log((airportObject.parallels[x]).slice(0, 2));
            if (b === (airportObject.parallels[x]).slice(0, 2)) {

                //added leading zero to b and now the get(b) doesn match the single digit key in the map

                //[HW, GUST HW, XW, GUST XW]
                let windArr = (rwyMap.get(String(rwyArray[a])));
                let windOut = 'missing';
                if (windArr[1] === 0) {
                    windOut = `${windArr[0]}KT HW, ${windArr[2]}KT XW`
                } else {
                    windOut = `${windArr[0]}KT HW, ${windArr[1]}KT GUST HW, ${windArr[2]}KT XW, ${windArr[3]}KT GUST XW`
                }

                trip = true;
                rwysWithWind.push(`${airportObject.parallels[x]}: ${windOut}`)

            } else {
                continue
            }
        }

        //if statement to fix issue of non-parallels being left out
        if (trip === false) {

            //[HW, GUST HW, XW, GUST XW]
            let windArr = (rwyMap.get(String(rwyArray[a])));
            let windOut = 'missing';
            if (windArr[1] === 0) {
                windOut = `${windArr[0]}KT HW, ${windArr[2]}KT XW`
            } else {
                windOut = `${windArr[0]}KT HW, ${windArr[1]}KT GUST HW, ${windArr[2]}KT XW, ${windArr[3]}KT GUST XW`
            }

            rwysWithWind.push(`${b}: ${windOut}`)

        }
    };

    //notam impact here!
    let clsdRwys = notamImp.get('RWYS');

    if (clsdRwys != []) {
        for (let q in clsdRwys) {
            for (let t in rwysWithWind) {
                if (clsdRwys[q] === rwysWithWind[t].match(/\d\d(L|R|C)?/)[0]) {

                    console.log(`REMOVING CLSD RWY LINE: ${rwysWithWind[t]}`);

                    rwysWithWind.splice(t, 1);
                } else {
                    continue
                }
            }
        }
    }



    //returns an array of strings that contain the hw/xw component for each legal rwy '13L: 10KT HW, 20KT GUST HW, 7KT XW, 10KT GUST XW', etc.
    console.log(rwysWithWind);
    return rwysWithWind;
};


//new 7/9/23... function to give us our XW numbers output for our taf tables... copied hwXw from abv and modified it to give us an array of strings containing... ['RWY NUMBER: 6KT / 12KT (XW/GUST XW)'] 
//rwyArray is array of legal rwys in number form [13, 31]
function xw(rwyArray, rwyMap, airportObject, notamImp) {

    console.log(`rwy array: ${rwyArray}`);

    //variable to hold actual rwy numbers (13L, etc.)
    let rwysWithWind = [];

    //adding iteration to create array of actual rwys in use and opp config rwys actual numbers (ex: from [13, 31] create [13L, 13R, 31L, 31R])

    for (let a in rwyArray) {

        let trip = false;
        let b = '';
        //if rwy number less than 10, adding leading zero to the string to match the db rwy numbers
        if (rwyArray[a] < 10) {
            b = String("0" + rwyArray[a])
        } else {
            b = String(rwyArray[a]);
        }

        //for loop adds parallels and their winds to the rwysWithWind array
        for (let x in airportObject.parallels) {
            console.log((airportObject.parallels[x]).slice(0, 2));
            if (b === (airportObject.parallels[x]).slice(0, 2)) {

                //added leading zero to b and now the get(b) doesn match the single digit key in the map

                //[HW, GUST HW, XW, GUST XW]
                let windArr = (rwyMap.get(String(rwyArray[a])));
                let windOut = 'missing';
                if (windArr[1] === 0) {
                    windOut = `${windArr[2]}KT XW`
                } else {
                    windOut = `${windArr[2]}KT / ${windArr[3]}KT`
                }

                trip = true;
                rwysWithWind.push(`${airportObject.parallels[x]}: ${windOut}`)

            } else {
                continue
            }
        }

        //if statement to fix issue of non-parallels being left out
        if (trip === false) {

            //[HW, GUST HW, XW, GUST XW]
            let windArr = (rwyMap.get(String(rwyArray[a])));
            let windOut = 'missing';
            if (windArr[1] === 0) {
                windOut = `${windArr[2]}KT XW`
            } else {
                windOut = `${windArr[2]}KT / ${windArr[3]}KT`
            }

            rwysWithWind.push(`${b}: ${windOut}`)

        }
    };

    //notam impact here!
    let clsdRwys = notamImp.get('RWYS');

    if (clsdRwys != []) {
        for (let q in clsdRwys) {
            for (let t in rwysWithWind) {
                if (clsdRwys[q] === rwysWithWind[t].match(/\d\d(L|R|C)?/)[0]) {

                    console.log(`REMOVING CLSD RWY LINE: ${rwysWithWind[t]}`);

                    rwysWithWind.splice(t, 1);
                } else {
                    continue
                }
            }
        }
    }

    //returns an array of strings containing... ['RWY NUMBER: 6KT / 12KT (XW/GUST XW)']
    console.log(rwysWithWind);
    return rwysWithWind;
};



//new 7/9/23... function to give us out gust factor output for our taf tables... copied hwXW from abv and modified it to give us an array of strings containing... ['RWY NUMBER: GUST FACTOR IN KT (GUST HW - STEADY HW)']
//added the wrong calculation... gust factor is not GUST HW - HW... it's total gust - steady state wind
//FIXED THIS IN THE ASYNC CODE... just simple calculation to get the number for use in the background of the program. no visual to it since it's such easy math... just visual alerting to user in the xw table row for certain conditions

//function to give us ONLY the steady state XW for use in determining xw severity criteria...
function steadyXw(rwyArray, rwyMap, airportObject, notamImp) {

    console.log(`rwy array: ${rwyArray}`);

    //variable to hold actual rwy numbers (13L, etc.)
    let rwysWithWind = [];

    //adding iteration to create array of actual rwys in use and opp config rwys actual numbers (ex: from [13, 31] create [13L, 13R, 31L, 31R])

    for (let a in rwyArray) {

        let trip = false;
        let b = '';
        //if rwy number less than 10, adding leading zero to the string to match the db rwy numbers
        if (rwyArray[a] < 10) {
            b = String("0" + rwyArray[a])
        } else {
            b = String(rwyArray[a]);
        }

        //for loop adds parallels and their winds to the rwysWithWind array
        for (let x in airportObject.parallels) {
            console.log((airportObject.parallels[x]).slice(0, 2));
            if (b === (airportObject.parallels[x]).slice(0, 2)) {

                //added leading zero to b and now the get(b) doesn match the single digit key in the map

                //[HW, GUST HW, XW, GUST XW]
                let windArr = (rwyMap.get(String(rwyArray[a])));

                console.log(`xw value: ${windArr[2]}`);

                let windOut = 'missing';
                if (windArr[2] < 20) {
                    windOut = 0;
                } else if ((windArr[2] >= 20) && (windArr[2] <= 29)) {
                    windOut = 1;
                } else if (windArr[2] > 29) {
                    windOut = 2;
                } else {
                    console.log(`error in calculating steady xw strength!!! see steadyXw() function!!!!`);
                }

                trip = true;
                console.log(`pushed data parallels: ${airportObject.parallels[x]}: ${windOut}`);
                rwysWithWind.push(`${airportObject.parallels[x]}: ${windOut}`)

            } else {
                continue
            }
        }

        //if statement to fix issue of non-parallels being left out
        if (trip === false) {

            //[HW, GUST HW, XW, GUST XW]
            let windArr = (rwyMap.get(String(rwyArray[a])));
            let windOut = 'missing';
            if (windArr[2] < 20) {
                windOut = 0;
            } else if ((windArr[2] >= 20) && (windArr[2] <= 29)) {
                windOut = 1;
            } else if (windArr[2] > 29) {
                windOut = 2;
            } else {
                console.log(`error in calculating steady xw strength!!! see steadyXw() function!!!!`);
            }

            console.log(`pushed data: ${b}: ${windOut}`);
            rwysWithWind.push(`${b}: ${windOut}`)

        }
    };

    //notam impact here!
    let clsdRwys = notamImp.get('RWYS');

    if (clsdRwys != []) {
        for (let q in clsdRwys) {
            for (let t in rwysWithWind) {
                if (clsdRwys[q] === rwysWithWind[t].match(/\d\d(L|R|C)?/)[0]) {

                    console.log(`REMOVING CLSD RWY LINE: ${rwysWithWind[t]}`);

                    rwysWithWind.splice(t, 1);
                } else {
                    continue
                }
            }
        }
    }

    //right nowm rwysWithWind is an array of strings [13L: 0, 1, or 2, 13R: 0, 1, or 2 etc.] (rwy number with L, R, C string, : steady xw strength number (0-2), all cast into a string). need to take the lowest strength number and return it

    //variable to hold the steady xw criteria from the rwysWithWind array
    let xwCrit = [];

    //variable to hold the highest steady xw criteria number
    let highest = -1;


    for (let y in rwysWithWind) {

        //grabbing the last element of each string in the array and pushing it to the xwCrit array (last element in each str is always the steady xw criteria)
        xwCrit.push(Number(rwysWithWind[y].slice(-1)))
    };

    console.log(`xw criteria array: ${xwCrit}`);

    //after we have the xwCrit array (array of all steady xw criteria), we can iterate through it to determine the lowest one
    for (let q in xwCrit) {

        if (xwCrit[q] > highest) {
            highest = xwCrit[q]
        } else {
            continue
        }

    }

    console.log(`highest steady xw criteria number: ${highest}`);

    //returns an number, indicating the steady state xw strength... 0 = steady xw < 20KTS, 1 = steady XW 20-29 inclusive, 2 = steady xw >= 30 KTS
    return highest;
};



//end of the functions that are executed within the async system
///////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////
//NOTAMS
///////////////////////////////////////////////////////////////////////
/*
//creating dummy Notam object for use in testing functionality concept

//creating NOTAM object
//maybe with each property, contain a map of next 12 hours with applicable impact at each hour key
let airportNotam = new Notam('KDAL', false, ["13R", "31L"], ["13R", "31L"], []);

//pushing object to the map that holds them in the global environment
notams.set('KDAL', airportNotam);
console.log(notams);
*/
//abandoned this idea... did not use the notams map
///////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////
//NOTAM PARSING FUNCTIONALITY

//DATETIME---> to parse notams, we are going to need to apply the datetime module to determine notam impact based on current time and then based on the times in the taf
//BEGIN WITH CURRENT TIME, CURRENT IMPACT (hour variable)

//notam sample: ORF 05/089 ORF RWY 05/23 CLSD EXC XNG DLY 0415-0915 2305150415-2305190915

//callback funtion that is called when the user submit notams info
function notamSub() {


    //done---code to parse the notam data and put it as strings in an array
    //then to parse each string in the array to create Notam objects to hold the applicable notam data for each airport. all notam objects are stored in the notams map
    //for reports, this was the metarShread() function



    //variable to hold all the notam data that's pasted into textarea as one large string
    let notamData = notamBox.value;


    //code to parse the notam data and put it as strings in an array

    /*
    //commented this out bc I ended up just using the regex patterns themselves in the match method below
    //regEx for d NOTAM
    const dNotamReg = new RegExp(/[A-Z][A-Z][A-Z]\s[0-9][0-9][/][0-9][0-9][0-9]\s[A-Z][A-Z][A-Z]\b/g);
 
    //regEx for FDC notam...
    //lesson learned here... /g goes at the end of the regex, not in the individual functions and methods!!! the g tells it to search the whole string for it, not just for the first instance in the str
    //need g here bc the textarea just holds all notams (both d and fdc) as one big string
    const fdcNotamReg = new RegExp(/[F][D][C]\s[0-9][/][0-9][0-9][0-9][0-9]\s[A-Z][A-Z][A-Z]\b/g);
 
    //regex for the end of a notam (d or fdc)
    const endNotam = new RegExp(/\b[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][-][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]/g);
    */

    //using the match method the regex to grab the d notams and fdc notams seperately and to add them to the correct arrays
    //just used the regex patters for each within the metch methods
    //the match method automatically returns all the matches in an array
    notamD = notamData.match(/[A-Z][A-Z][A-Z]\s[0-9][0-9][/][0-9][0-9][0-9]\s[A-Z][A-Z][A-Z]\b[\s\S]+?\b[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][-][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]/gm);

    //for this one, the regex pattern grabs EST at the end of the FDC notam if it's there. otherwise it leaves it off. either way, it grabs each notam individually, as the regex pattern matches each notam
    //lesson learned... had to use [/s/S]+? instead of .+
    //. grabs all characters except line breaks, so using it only allowed us to grab the first line of each fdc notam
    //[\s\S]+? grabs all characters, including line breaks, but grabs as few as possible between the beginning of the pattern and the end of the pattern. basically, the +? tells it to only grab what lies between the beginning of each notam and the end of each notam (the data string)
    notamFDC = notamData.match(/[F][D][C]\s[0-9][/][0-9][0-9][0-9][0-9]\s[A-Z][A-Z][A-Z]\b[\s\S]+?\b[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][-][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]([E][S][T])?/gm);

    console.log(`d notams: ${notamD}`);
    console.log(`fdc notams: ${notamFDC}`);

    //hiding the notam input textarea and the notam submit button
    // notamBox.classList.add('hidden');
    // notamSubmitB.classList.add('hidden');

    //instead of hiding individual elements within the notam input section, code hides the whole section...
    notamInput.classList.add('hidden');

    //calling the async function to get the data from the server
    getAirportData();

    //commented out for now... error in wind data?/?
    //calling the async function to get data from the server for use with the tafs
    //defaults to nine fours for now... need to make the number of hours a variable for use with a user-defined timeframe setting
    getForecastData(forecasts, notamD, 9, reports);

};



//copied metarShread below... function needed to parse the array of d notams and to create a map of notam details for the current airport (current airport in the async function). returns map of notam data for the current airport, passed-in in the async function)

//here is the created notam class. look for these things...
/*
class Notam {
    constructor(apt, closed, rwys, ils, gps) {
        this.closed = closed;
        this.rwys = rwys;---done!!! 5/26/23
        this.ils = ils;---done!!!
        this.gps = gps;
 
    }
}
*/


//called as stand-alone function within the async function
//takes airport id and the d notam array as arguments and searches for applicable notams on demand

//for timeframe, need to add argument to take hours later than current time (would be 0 for current notams, 1 for 1 hour from now, etc.)
//intendedTime is this number... 0 for current notams, 1 for notams that applicable at the next even Z hour (ex: if it is 0138Z right now, intendedTime of 1 would give us 02Z notams)


//notamShread function is done. It works for current time and for current time plus intendedTime for future notam impact

function notamShread(apt, notamArr, intendedTime) {

    //map that holds the data that comes from the notams. this map is returned by the function
    let notamMap = new Map();

    //variable to hold array of only notams that apply to the passed-in airpprt
    let theseNotams = [];

    //variable to hold array of notams that apply with the given timeframe
    let appNotams = [];

    //iterating through each notam in the array of all the notams and determining if it applies to the current airport. if so, adding the notam to the theseNotams array
    for (let x in notamArr) {
        if (notamArr[x].search(apt.slice(1)) != -1) {
            theseNotams.push(notamArr[x])
        }
    };

    //scaffolding
    console.log(theseNotams);


    //handling the intendedTime argument...
    //if it is zero, take current Z time and get notams that are active now
    //if it is 1, take current Z time hour (global var called "hour") and add the argument to it to get the Z time for which we want active notams

    //variable to hold the time for which we want active notams
    let applicationTime;

    //logic to calculate applicationTime (time for which we want the active notams)
    if (intendedTime === 0) {

        //if it is zero, take current Z time and get notams that are active now
        //Date.parse() takes the passed-in time and converts it to milliseocnds since 1-1-1970 JS standard for time
        //allows us to do math with time

        //current date/time
        let tempDate = new Date();

        applicationTime = Date.UTC((tempDate.getUTCFullYear()), (tempDate.getUTCMonth()), (tempDate.getUTCDate()), (tempDate.getUTCHours()), (tempDate.getUTCMinutes()));

        //converting to UTC

        console.log(`application time: ${applicationTime}`);
    } else if (intendedTime > 0) {

        //current date/time
        let tempD = new Date();

        applicationTime = Date.UTC((tempD.getUTCFullYear()), (tempD.getUTCMonth()), (tempD.getUTCDate()), (tempD.getUTCHours()), (1)) + (intendedTime * 3600000);
        //3,600,000 milliseconds in an hr. taking that times the number of hrs you want to go in future and adding it to the current UTC time in milliseconds
        //changed the minutes to a standard of 1... gives us notam impact for one minute after the hr for each hour in the future (0201Z for the 02Z hr, 0301Z for the 03Z hr, etc.)
        //this aligns with the taf timframe logic as well and will allow us to show Z time hours as headings in our taf-line table

        console.log(`FUTURE NOTAMS TIME: ${applicationTime}`);
    } else {
        console.log(`IntendedTime cannot be less than zero!!!`);
    };


    //looking at the notams in the theseNotams array (only the notams that apply to the current airport) and looking at timeframe of each of them.
    //functionality to extract start date/time and end date/time from each notam and then determine, based on the passed-in timeframe, which notams among those in the theseNotams array are currently active
    //for forecast tables, will need to run this function for each hour of the table (up to 12 times per table)
    //regex to find the start and end times, then date constructor to create new date and time for each
    const notamTimes = new RegExp(/\b[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][-][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]([E][S][T])?/gm)

    //bc phone numbers are sometimes found in notams, looking for both dates first, then parsing from there
    //this code give us an array of only the notams that apply for the given timeframe
    for (let k in theseNotams) {

        //searching the current notam for the start/end time
        let times = theseNotams[k].match(notamTimes);
        console.log(`ALL NOTAM TIMES: ${times}`);

        //searching the start/end time for the individual times. reassigns variable to hold array of the start time and end time
        times = times[0].match(/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]/gm);

        console.log(`TIMES AFTER MATCH: ${times}`);

        //taking each element in the array (start/end time) and creating a date/time object from it
        //need to subtract 1 from the month bc js counts months from 0-11
        //notam date/time format = YYMMDDTTTT-YYMMDDTTTT
        //these are output in milliseconds since 1-1-1970 UTC
        let startTime = Date.UTC(("20" + times[0].slice(0, 2)), (times[0].slice(2, 4) - 1), (times[0].slice(4, 6)), (times[0].slice(6, 8)), (times[0].slice(8, 10)));

        let endTime = Date.UTC(("20" + times[1].slice(0, 2)), (times[1].slice(2, 4) - 1), (times[1].slice(4, 6)), (times[1].slice(6, 8)), (times[1].slice(8, 10)));

        //scaffold
        console.log(`NOTAM START: ${startTime}`);
        console.log(`NOTAM END: ${endTime}`);

        //test to ensure that the NOTAM times makes sense...
        if ((startTime - endTime) > 0) {
            console.log(`Error!!! NOTAM times are backward`);
        };

        console.log(`app - start: ${(applicationTime - startTime)}`);
        console.log(`end - app: ${endTime - applicationTime}`);

        //logic to grab the applicable notams and to add them to the appNotams array
        if (((applicationTime - startTime) >= 0) && ((endTime - applicationTime) > 0)) {
            appNotams.push(theseNotams[k])
            console.log(`notam added: ${theseNotams[k]}`);
        };
    };

    console.log(`appNOTAMs array: ${appNotams}`);

    //for the abv logic, later - earlier === + or 0


    //code to parse the notams and fill the map with the applicable data

    //looking for rwy closures
    const rwyClsd = new RegExp(/[R][W][Y]\s\d\d[\s\S]+?[C][L][S][D]/m);

    let theseRwys = [];

    for (let y in appNotams) {
        if ((appNotams[y].search(rwyClsd)) != -1) {
            console.log(appNotams[y].match(rwyClsd));

            let tempStr = '';
            let tempRwys;

            tempStr = (appNotams[y].match(rwyClsd))[0]
            console.log(tempStr);

            tempRwys = tempStr.match(/\d\d[A-Z]?/g)

            //taking the rwys from the notam and pushing them into the theseRwys array
            for (let m in (tempRwys)) {
                theseRwys.push(tempRwys[m])
            }
        }
    }

    //adding closed rwys to the notams map
    notamMap.set('RWYS', theseRwys);

    //looking for ils outages... loc, ils, om, AND GP
    //will also look for GP out here as well... will put in documentation that user may still have LOC approach available, even if the ILS does not show available

    //create all regex, put them in array, then just check each notam against the array of regex... similar to what I did with VIS reading for fractions, whole numbers, etc.
    const gpOut = new RegExp(/[N][A][V]\s[I][L][S]\s[R][W][Y]\s\d\d[A-Z]?\s[G][P]\s[U][/][S]/m);
    const locOut = new RegExp(/[N][A][V]\s[I][L][S]\s[R][W][Y]\s\d\d[A-Z]?\s[L][O][C]\s[U][/][S]/m);
    const omOut = new RegExp(/[N][A][V]\s[I][L][S]\s[R][W][Y]\s\d\d[A-Z]?\s[O][M]\s[U][/][S]/m);
    const ilsOut = new RegExp(/[N][A][V]\s[I][L][S]\s[R][W][Y]\s\d\d[A-Z]?\s[U][/][S]/m);

    //array holding all regex
    let regexArr = [gpOut, locOut, omOut, ilsOut];


    let theseIls = [];

    for (let y in appNotams) {
        for (let r in regexArr) {
            if ((appNotams[y].search(regexArr[r])) != -1) {
                console.log(appNotams[y].match(regexArr[r]));

                let tmpStr = '';
                let tmpIls;

                tmpStr = (appNotams[y].match(regexArr[r]))[0]
                console.log(tmpStr);

                tmpIls = tmpStr.match(/\d\d[A-Z]?/g)

                //taking the rwys from the notam and pushing them into the theseRwys array
                for (let m in (tmpIls)) {
                    theseIls.push(`ILS ${tmpIls[m]}`)
                }

            }
        }
    }

    //adding OTS ILS to the notams map
    notamMap.set('ILS', theseIls);


    //looking for AD clsd notam... 

    const adOut = new RegExp(/[A][D]\s[A][P]\s[C][L][S][D]/m);
    const dly = new RegExp(/[D][L][Y]\s\d\d\d\d[-]\d\d\d\d/m)

    let aptClose = false;

    for (let y in appNotams) {
        if ((appNotams[y].search(adOut)) != -1) {
            console.log(appNotams[y].match(adOut));

            aptClose = true;

            if ((appNotams[y].search(dly)) != -1) {

                let tpStr = '';
                let tpTime;

                tpStr = (appNotams[y].match(dly))[0]
                console.log(tpStr);

                tpTime = tpStr.match(/\d\d\d\d/gm)

                //instead of trying to create date objects and compare them to the start and end times in the dly notam, thinking need to get hours and minutes from applicationTime and compare it to the integer hours and minutes from the dly timeframe in the notam
                //compare hrs first, then minutes if necessary

                //for dly timeframes, for a timeframe like 1300-0200 to work, bc we are looking only that hrs/mins and not dates, need 0200 to be added to 2400 for it to work...
                //so...

                let endHr = Number(tpTime[1].slice(0, 2));

                //if end hr is less than beginning hour, then need to add 24 to end hour...
                if ((Number(tpTime[0].slice(0, 2)) - Number(tpTime[1].slice(0, 2))) > 0) {

                    //adding 24 to the ending hr if the timeframe crosses midnight
                    endHr = endHr + 24;
                    console.log(`NEW END HR: ${endHr}`);
                } else if ((Number(tpTime[0].slice(0, 2)) - Number(tpTime[1].slice(0, 2))) === 0) {

                    //log error message since the beg and end hr cant be same...
                    console.log(`ERROR!!! BEGINNING AND END HR CANT BE THE SAME IN DLY NOTAM!!!`);
                }

                //application time
                console.log(`DLY application time: ${new Date(applicationTime)}`);

                //cast application time as a date object bc it became a number of miliseconds from 1/1/1970
                let tDate = new Date(applicationTime);

                let decStart = Number(tpTime[0].slice(0, 2)) + Number((tpTime[0].slice(2)) / 60);
                console.log(`DEC start: ${decStart}`);

                //if end time is 0000, doenst work... need to translate this into 2400
                let decEnd = endHr + Number((tpTime[1].slice(2)) / 60);
                console.log(`DEC end: ${decEnd}`);

                let hrs = tDate.getUTCHours();
                let mins = tDate.getUTCMinutes();

                console.log(`hrs: ${hrs}`);
                console.log(`Mins: ${mins}`);

                let decAppTime = (tDate.getUTCHours()) + ((tDate.getUTCMinutes()) / 60)

                console.log(`DEC app time: ${decAppTime}`);


                if (((decAppTime - decStart) >= 0) && ((decEnd - decAppTime) > 0)) {
                    aptClose = true;
                    console.log(`AD closed per dly notam`);
                } else if ((Number(tpTime[0].slice(0, 2)) - Number(tpTime[1].slice(0, 2))) > 0) {

                    //if the dly times cross midnight z... need to check for dec app time between 00z and the unadjusted dly end time 
                    if ((Number(tpTime[1].slice(0, 2)) - decAppTime) > 0) {
                        aptClose = true;
                        console.log(`AD closed per dly notam! (crossed midnight!!!)`);
                    } else {
                        aptClose = false;
                        console.log(`DLY NOTAM but not currently active (crosses midnight)`);
                    }
                } else {
                    aptClose = false;
                    console.log(`DLY NOTAM but not currently active`);
                }

            }
        }
    }


    //adding airport closed status to the notam map
    //if airport closed with no daily times given, just holds true
    //if airport closed dly time-time, holds array of start time and end time of closure
    notamMap.set('CLSD', aptClose);


    //6/23/23... important!!! need to remove the functionality for returning an array of dly ad closure times and need to replace it with functionality to determine whether or not the ad is closed for the requested notam timeframe!!!

    //currently, no functionality to search for rwy lighting outages
    //need to add later!!!

    //currently, does not consider daily timeframes of notam (if given), except for AD closure notams...
    //need to add later!!!


    //remember, this function will need to be assigned to variable when it's called, bc variable needed to hold the map
    //can call variable_name.get('RWYS), etc. to get the data contained in the map

    //so far {'RWYS':[array of strings of clsd rwys], 'ILS':[array of strings of ots ils], 'CLSD': boolean (false if open, true if clsd) OR array holding strings of start time and end time of closure, if it is a daily closure}
    return notamMap;
};



//take all the scaffolding from within the wx parsing funtions out of the script... really bogging down the console!!!

//edit the html text to say "straight-in approaches/minimums"
//edit the wording for GPS approaches (say general "RNAV"???)

//add drag/drop functionality for each airport li in the html code?
//think going to have to add a div between each li to enable user to drag/drop any li at any point on the page



///////////////////////////////////////////////////////////////////////
//TAF DATA PARSING FUNCTIONALITY


//copied code below... modified to use the taf data with airport data on the server
//side note... for the getAirportData() function, need arguments for report object, notam data (notamD), and airport object (from server DB)
//defined parameters for the function below...
//fcsts === the forecasts map
//nData === notamD array
//hrs === number of hours through which we want taf data output
//rpt === the reports map (needed to get the metar for each taf)

function getForecastData(fcsts, nData, hrs, rpt) {
    fetch('http://localhost:3001/').then(function (response) {
        console.log(response);
        return response.json();
    }).then(function (data) {
        console.log(data);

        fcsts.forEach(function (v, k) {
            for (let i in data) {
                // console.log(data[i].apt);
                if (data[i].apt === k) {
                    console.log('found!');

                    //variable that will hold table code in html
                    let h;

                    /*
                    //variable to hold the bones of a blank table
                    //added this code to the metar html code... allows us to put metar/taf data together
                    //id = "tb-KDAL", etc.
                    let tab = `<table id=tb-${k}></table>`

                    //afterbegin makes the html the first child each time it inserts it
                    //each time we get forecast data for an airport, creates a new table for us to populate...
                    metarOutput.insertAdjacentHTML('afterbegin', tab);
                    */

                    //selecting the div that we made to hold the taf boxes
                    const tafBoxes = document.getElementById(`taf-boxes-${k}`);

                    //selecting the table structure that we created
                    const tbInput = document.getElementById(`tb-${k}`);


                    //variables to hold arrays for each row in the UI

                    //flt cat... vfr, ifr, etc.
                    let flightCategory = [];

                    //type of iap available
                    let iapType = [];

                    //rwys with an available approach
                    let iapRwy = [];

                    //xw data
                    let xwData = [];

                    //steady xw strength criteria
                    let steadyStr = [];

                    //gust factor impact... 0 for less than 10kts abv steady state, 1 for 10-20 kts abv steady state, 2 for anything higher
                    let wFactor = [];


                    //if the objects match up, execute the functions below

                    //add iteration through the specified number of hours here... also need to add a parameter for the user-specified number of taf hours through which we want data
                    for (let hr = 0; hr < hrs; hr++) {


                        //for the notam function... airport id would be data[i].apt
                        //notam code here...
                        let notamImpact = notamShread(data[i].apt, nData, hr);
                        console.log(notamImpact);

                        //when notams close all favored rwys

                        //rwys is a map of runway numbers in use (array), hw/xw component for them (array) corrected for variation, runway numbers of opposite config (array) 
                        let rwys = calcRwy(v.outputTaf(hr), data[i]);
                        console.log(`rwys map: ${rwys}`);


                        //tested is an array of all of the favored rwys/approaches that are in limits
                        let tested = testWinds(v.outputTaf(hr), rwys);
                        console.log(`all favored rwys: ${tested}`);

                        //below gives us hw/xw for each favored rwy
                        //output is an array of strings '18L: 10KT HW, etc.'
                        // for (let x in tested) {
                        //     console.log(`hw/xw for ${tested[x]}: ${rwys.get(`${tested[x]}`)}`);
                        // }
                        //wrote function for the abv...
                        let allWind = hwXw(tested, rwys, data[i], notamImpact);
                        console.log(`FAVORED AFTER NOTAM CUTS: ${allWind}`);


                        //added 7/9/23... if no vrb winds in the taf line, then determines xw/gust xw for display in the table. otherwise, displays VRB for wind component and uses the tw (negative hw factor to determine alert class)...
                        if (v.outputTaf(hr).vWinds === false) {

                            //if no vrb winds in current taf line...

                            //ADDED 7/9/23... is an array of [10L: 10 / 16, 10R: 10 / 16] (array of rwy numbers: xw/gust xw numbers)
                            let xwOnly = xw(tested, rwys, data[i], notamImpact);
                            console.log(`XW: ${xwOnly.join('<br>')}`);
                            xwData.push(xwOnly.join('<br>'))
                            console.log(`xwData array: ${xwData}`);

                            let steadyCrit = steadyXw(tested, rwys, data[i], notamImpact);
                            console.log(`highest steady XW number: ${steadyCrit}`);
                            steadyStr.push(steadyCrit);

                            console.log(`steady str array: ${k} ${steadyStr}`);


                        } else if (v.outputTaf(hr).vWinds === true) {

                            xwData.push(`VRB`);
                            steadyStr.push(-1);
                            console.log(`VRB winds!!!`);

                        } else {
                            console.log(`error in determining xw/gust xw table data!!!`);
                        };


                        //ADDED 7/9/23... remember, gust factor is just gust hw - steady hw... not rwy-specific!!!

                        //readWind() returned value...
                        //what this function's returned map looks like: {'dir' => 340, 'speed' => 8, 'gust' => 25}

                        //gFactor is the gust factor in knots (number)
                        //will be zero or negative if there is no gust
                        let gFactor = ((v.outputTaf(hr).wind.get('gust')) - (v.outputTaf(hr).wind.get('speed')))
                        console.log(`GUST FACTOR: ${gFactor}`);


                        //gust factor impact... 0 for less than 10kts abv steady state, 1 for 10-20 kts abv steady state, 2 for anything higher
                        //code below populates the wFactor array for use with our taf table... will use css styling based on the number in the corresponding array index for each column of the table
                        if (gFactor > 20) {
                            wFactor.push(2)
                        } else if (gFactor >= 10) {
                            wFactor.push(1)
                        } else {
                            wFactor.push(0)
                        };

                        console.log(`Wfactor array: ${wFactor}`);



                        //avail is a map of actual runway numbers for favored rwy(s) and opp config rwy(s). the runway numbers are strings contained in arrays
                        let avail = availRwy(tested, rwys, data[i], notamImpact);
                        console.log(`AVAIL: ${avail}`);

                        //vartiables to hold actual rwy numbers in strings
                        let favoredRwys = avail.get('favored rwys');
                        let oppositeRwys = avail.get('opp config');


                        if (favoredRwys.length != 0 && oppositeRwys.length != 0 && notamImpact.get('CLSD') != true) {

                            //populating the flight category from the applicable taf line into the flightCategory array
                            console.log(`FLT CAT: ${v.outputTaf(hr).fltCat}`);
                            flightCategory.push(v.outputTaf(hr).fltCat);
                            console.log(`FLT CAT ARRAY: ${flightCategory}`);


                            console.log(`favored rwy numbers: ${favoredRwys}`);
                            console.log(`opp config rwy numbers: ${oppositeRwys}`);

                            //determining available cat i ils or gps
                            let approachAvail = availApp(favoredRwys, data[i], notamImpact);
                            let approachOpp = availApp(oppositeRwys, data[i], notamImpact);

                            //functionality to populate the iapType array with either ILS or GPS, depending on the type of iap available
                            //also, functionality within this to use regex to pull that associated rwys from the approachAvail array
                            //this does not account for ils/gps that are available on opposite config, when the opposite config is within wind limits
                            //need to add this later!!!
                            //maybe logic such that, if wind-favored config has no iap available and the opp config within wind limits, pull the available approach from the opp config (approachOpp)
                            //also, consider circle-to-land
                            if ((approachAvail[0].search(/[I][L][S]/)) != -1) {
                                //pushing the Number 1 to the iapType array if ILS available
                                iapType.push(1)
                                console.log(`ILS available. The array: ${iapType}`);

                                //temp array to hold all rwys for each hour
                                let tempArr = [];

                                //pulling the rwys with an ils available...
                                for (let z in approachAvail) {
                                    tempArr.push(approachAvail[z].match(/\d\d[LRC]?/).join(''))
                                    console.log(`ILS RWYS: ${tempArr}`);
                                };
                                //pushes string of all available rwys for each hr as an invidiaul element of the iapRwy array 
                                iapRwy.push(tempArr.join(','));
                                console.log(`iapRwy array: ${iapRwy}`);

                            } else if ((approachAvail[0].search(/[G][P][S]/)) != -1) {
                                //pushoing the Number 2 to the iapType array if GPS iap available
                                iapType.push(2)
                                console.log(`GPS available. The array: ${iapType}`);

                                //temp array to hold all rwys for each hour
                                let tempArr = [];

                                //pulling the rwys with an gps available...
                                for (let z in approachAvail) {
                                    tempArr.push(approachAvail[z].match(/\d\d[LRC]?/).join(''))
                                    console.log(`GPS RWYS: ${tempArr}`);
                                };
                                //pushes string of all available rwys for each hr as an invidiaul element of the iapRwy array 
                                iapRwy.push(tempArr.join(','));
                                console.log(`iapRwy array: ${iapRwy}`);

                            } else {
                                //if no iap available, pushing Number 0 to the array
                                iapType.push(0)
                                console.log(`No IAP available. The array: ${iapType}`);

                                //pushing the number zero to the iapRwy array to indicate no straight-in, wind-favored iap
                                iapRwy.push(0);
                                console.log(`SEE PLATES`);
                            }

                            console.log(`favored ils: ${approachAvail}`);
                            console.log(`opp ils: ${approachOpp}`);

                            //need to add function to determine approach mins if there are any ils available...
                            //if no ils, print string reference gps mins
                            let minsFav = ldgMins(approachAvail, data[i]);
                            let minsOpp = ldgMins(approachOpp, data[i]);

                            console.log(`favored mins: ${minsFav}`);
                            console.log(`opp mins: ${minsOpp}`);


                            //if we create an array for each table row that we want to populate (flt cat, rwy/available iap, and HW/XW components) and push the values for each hour into the arrays as we iterate through the hours, we can then, after the arrays are complete for all the applicable hours that the user requested, use the arrays to populate our desired UI (table with colored and textual elements)
                            //so instead of the HTML output that we did for each metar, we will take these same data points and put them into an array for use with our UI
                            //UI will be populated/created after all the arrays are complete


                            //bc minsFav can be a string instead of an array (when there are no ils available), if statement here to convert it to an array if it's not one already. then the join method will work as designed in the html code...
                            let modMinsFav = [];
                            let modMinsOpp = [];

                            if ((typeof minsFav) === "string") {
                                modMinsFav.push(minsFav)
                                console.log(`String to array (FAV)! ${modMinsFav}`);
                            } else {
                                modMinsFav = minsFav;
                            }

                            if ((typeof minsOpp) === "string") {
                                modMinsOpp.push(minsOpp)
                                console.log(`String to array (OPP)! ${modMinsOpp}`);
                            } else {
                                modMinsOpp = minsOpp;
                            }

                            //6/18/23... have arrays for flt cat and iap type/iap rwy available
                            //need to create a column in our table based upon the number of hours requested (4 is passed-in, then 4 columns needed in table)... four divs for this???

                            //maybe iterate through each element of each array and create html code for each... just need html code to be added to the index.html for each iteration

                            let html = `<li class="report" id='reports'>
                    <h2 class="airport-name">${v.id} TAF DATA</h2>
                    <div class="wx-info">
                        <span class="hour"><strong>TAF hour: ${hr}</strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="metar"><strong>APPLICABLE TAF LINE: ${v.outputTaf(hr).line}</strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="category">WX CATEGORY: <strong> ${v.outputTaf(hr).fltCat} </strong></span>
                    </div>
                    <div class="wx-info">
                        <span>WIND-FAVORED RUNWAYS: <strong id="rwy"> ${favoredRwys.join(' ')} </strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="wind">HW/XW COMPONENTS: <strong>  <br> ${allWind.join('<br>')} </strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="app">AVAILABLE APPROACHES: <strong><br> ${approachAvail.join('<br>')} </strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="app">AVAILABLE APPROACHES OPPOSITE CONFIG: <strong><br> ${approachOpp.join('<br>')} </strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="mins">LANDING MINS WITH AVAILABLE APPROACHES: <strong><br> ${modMinsFav.join('<br>')} </strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="mins">LANDING MINS ON OPPOSITE CONFIG: <strong><br> ${modMinsOpp.join('<br>')} </strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="alt">ALTERNATE REQUIRED BY 1-2-3 RULE?<strong> </strong></span>
                    </div>
                    <div class="wx-info">
                        <span class="tstms">THUNDERSTORMS FORECAST?<strong> </strong></span>
                    </div>
                    </li>`;

                            //afterbegin makes the html the first child each time it inserts it
                            tafBoxes.insertAdjacentHTML('afterbegin', html);

                            //the abv code is executed for each element in the reports map. it matches the report element with the airport object and then performs the abv functions.
                        } else if (notamImpact.get('CLSD') === true) {

                            //logic for if airport clsd by ad clsd notam
                            flightCategory.push(`clsd`);
                            iapType.push(`clsd`);
                            iapRwy.push(`clsd`);

                            console.log(`AD clsd notam!!`);
                        } else {

                            //logic for if there are no open rwys for the current hr... populate each array with the string 'clsd'
                            //for use as the css class to indicate closed airport for that hour... dark cell
                            flightCategory.push(`clsd`);
                            iapType.push(`clsd`);
                            iapRwy.push(`clsd`);

                            console.log(`closed runway code executed this hr!`);

                        }

                        //need to change notamShread function to, if there is a dly ad closure, determine whether or not the notam time is within it and output either true or false accordingly
                        //remove array for dly times

                    }

                    //after iterating through each requested hour and populating our arrays for each row of the table, will create our table for the current airport right here...
                    //iterate through the length of the arrays, creating a table column each time and adding it to the existing table???
                    //so... need to create the bones of a table in the index.html file, then, similiar to abv, add the html for each column of the table to the html file from here...
                    //make table visible only after it is complete (after the iteration/loop is completed)... use hidden class???

                    //to display metar with each taf table...
                    //li to stay in line with taf formatting
                    let metarDisp = `<ul><strong><li class="m" id=${k}>${rpt.get(k).metar}</li></strong></ul>`


                    //to display the taf with the taf table...
                    //li to make sure taf format is correct
                    let tafDispArr = [];

                    for (let y in v.taflines) {
                        tafDispArr.push(`<li>${v.taflines[y].line}</li>`)
                    }

                    //variable to hold the taf in string form to add within a div above each taf table
                    let tafDisp = `<ul class="taf"><strong>${tafDispArr.join('')}</strong></ul>`



                    //variables to hold the html code to put within each table row...
                    //bc strings are ummutable, creating each row as an array, then will join all array elements together into a str

                    //headers (hours)
                    let hours = [`<th>${v.id}</th>`];

                    //flt catergory row
                    let cats = [`<td>FLIGHT CATEGORY</td>`];

                    //iap row
                    let iaps = [`<td>RUNWAY / APPROACH</td>`];

                    //XW / GUST XW row
                    let windy = [`<td class="wind">XW / GUST XW</td>`];

                    //iterate through the arrays to populate each row array variable with the correct html code...
                    for (let u = 0; u < hrs; u++) {
                        //have to define the table by row...
                        //defining html in strings by row, pushing each one into an array, then joining them into one string to insert into the html doc...


                        //table headers (hours)
                        if (u === 0) {
                            hours.push('<th>CURRENT</th>')
                        } else {

                            //current date/time from global variable... d

                            let tableTime = Date.UTC((d.getUTCFullYear()), (d.getUTCMonth()), (d.getUTCDate()), (d.getUTCHours())) + (u * 3600000);
                            //3,600,000 milliseconds in an hr. taking that times the number of hrs you want to go in future and adding it to the current UTC time in milliseconds
                            //changed minutes to a standard of 1... gives us 0201Z, 0301Z, etc.


                            //remember, tableTime is a number in milliseconds... must take it in new Date() to get a date object from which we can get the UTC hour
                            hours.push(`<th>${new Date(tableTime).getUTCHours()}Z</th>`)
                        }

                        //table row one (flt cat). first column is the row title
                        if (flightCategory[u] === `clsd`) {

                            //7/4/23... aded quotes around class name to make correct html
                            cats.push(`<td class='clsd'></td>`);
                            iaps.push(`<td class='clsd'></td>`);
                            windy.push(`<td class='clsd'></td>`);

                        } else {

                            //logic for when airport is not closed... all logic for each table row is here.
                            //done by table row...

                            //flt category row...
                            //7/4/23... added class=fltcat to style based on flt cat
                            cats.push(`<td class='${(flightCategory[u]).toLowerCase()}'>${flightCategory[u]}</td>`)


                            //need to add style for the type of iap...
                            //iapType array gives us this info...
                            //added an html class to each <td> element in the iap row. then added corresponding styling in css

                            //learning experience here!!!
                            //selecting each index within the iap row in the table to add class for css styling based on the type of iap available
                            //this doesnt work bc this isnt a dom element yet... just js code
                            // const iapIndex = document.getElementById(`typeIndex${u}`);


                            //rwy/iap row...
                            //table row two (rwy and iap available). first column is row title... then added approach rwy numbers and styled according to which approach is available
                            let apchType;

                            //logic to add style for ils, gps, or see plates
                            //classes: ils, gps, chart
                            if (iapType[u] === 1) {

                                apchType = 'ils'


                                iaps.push(`<td class=${apchType}>${iapRwy[u]}</td>`)


                            } else if (iapType[u] === 2) {

                                apchType = 'gps'

                                //table row two (rwy and iap available). first column is row title
                                iaps.push(`<td class=${apchType}>${iapRwy[u]}</td>`)

                            } else {

                                apchType = 'chart'

                                //table row two (rwy and iap available). first column is row title
                                iaps.push(`<td class=${apchType}>${iapRwy[u]}</td>`)

                            }


                            //xw/gust xw row...
                            //7/9/23... adding logic for xw/gust xw and gust factor table row...

                            //variable to hold gust factor impact
                            let gImpact;

                            //steady xw criteria...
                            let strClass;

                            console.log(`steady str: ${steadyStr[u]}`);

                            if (steadyStr[u] === 0) {

                                //steady xw < 20...
                                strClass = 'lgt';

                            } else if (steadyStr[u] === 1) {

                                //steady xw 20-29 inclusive...
                                strClass = 'mdt';
                            } else if (steadyStr[u] === 2) {

                                //steady xw > 29...
                                strClass = 'str'
                            } else if (steadyStr[u] === -1) {

                                //functionality if vrb winds... nothing for now...
                                //vrb class not currently defined in css
                                strClass = 'vrb'

                                console.log(`VRB WINDS... no steady xw strength criteria!!!`);
                            } else {

                                console.log(`STEADY STR XW ERROR`);
                            };

                            console.log(`SS class: ${strClass}`);

                            //logic to add styling (class) for the corresponding gust factor
                            if (wFactor[u] === 0) {

                                //no gust factor impact... zero class
                                gImpact = 'zero';

                            } else if (wFactor[u] === 1) {

                                //gust factor impact... 10KT up to but not including 20KTS... one class
                                gImpact = 'one';

                            } else if (wFactor[u] === 2) {

                                //gust factor impact... greater than 20KTS... two class
                                gImpact = 'two';

                            } else {
                                console.log(`error in determining table wind criteria!!!`);
                            }

                            //scaffolding to show each value...
                            console.log(`wfact: ${wFactor[u]}`);
                            console.log(`sStr: ${steadyStr[u]}`);

                            //logic to push the greater impact into the ui...
                            if (wFactor[u] > steadyStr[u]) {

                                //if gust factor more impact than steady xw, steady xw class left out...
                                windy.push(`<td class="${gImpact} wind">${xwData[u]}</td>`)
                            } else if (wFactor[u] < steadyStr[u]) {

                                //if steady xw more impact than gust factor, gust factor left out
                                windy.push(`<td class="${strClass} wind">${xwData[u]}</td>`)

                            } else if (wFactor[u] === steadyStr[u]) {

                                //if steady xw more impact equal to gust factor impact, steady xw class controls...
                                windy.push(`<td class="${strClass} wind">${xwData[u]}</td>`)

                            } else {

                                console.log(`error in determing css styling for wind impact!!!!`);
                            }


                            //logic for the next table row goes here...

                        }
                    }


                    //variables to hold individual table row strings
                    //one varioable per table row
                    //string template with the th/td elements added via ${} within each??
                    //is a str with the needed td/th added via ${}
                    let rowHead = `<tr>${hours.join('')}</tr>`;
                    let rowCat = `<tr>${cats.join('')}</tr>`;
                    let rowIap = `<tr>${iaps.join('')}</tr>`;
                    let rowWind = `<tr>${windy.join('')}</tr>`;


                    //concantante the strings together to get html to add to the index.html doc
                    //added div to contain the whole thing so that we can add shadow to it...
                    //added a div at the end of it so that we can add drag/drop functionality later
                    h = metarDisp + tafDisp + rowHead + rowCat + rowIap + rowWind + `<div></div>`;
                    console.log(`HTML PLAIN TEXT: ${h}`);
                    //removed tafDisp from abv... see code line 2852


                    //inserts the html code into the table element that we are creating to the current airport
                    tbInput.insertAdjacentHTML('afterbegin', h)
                }
            }
        })
    })
}

//END OF ASYNC FUNCTION





//next steps... AFTER 6/18/23
//add styling to the table... hover, click functionality
//maybe have taf line, opp config, etc available on hover??
//add drag/drop functionality
//add table to indicate which airports have wx/notam data
//add functionality for user selection of timeframe---settings menu
//add utc date/time and airport name header to table

//code line 108 and code line 498... eventlistener for when user clicks a table header... code line 498... need to add modal functionalty and the th ids and the modal ids
//create modal for taf times
//add alternate requirements table row (later) 1-2-3 rule

//code line 532... need to add functionality for display of the settings <aside>... display data tray, timeframe, and (later) color scheme selection
//function for user-selected taf table timeframe (getForecastData()... cl 2180)
//error handling!!!


//cl 504 has toSelect() click event function (function that houses all the different click event outcomes based on event.target)

//build python program to manage db???

//fixed bug for notam times that cross midnight... had discrepancy between decimal time and actual application time when added 24 to the end time that crossed midnight. all fixed on 7/4/23!!!

//7/9/23... added xw / gust xw table tow, along with criteria for css styling depending on either/both gust factor and/or steady xw factor... code line 2211 gives us function for determining only steady xw
//cl 2932 for if statement logic to build the arrays that populate the table
//cl 3285-3364 for table-building logic
//table row for table wind data... xw/gust xw (steady state < 20 = green, 20-30 = yellow, > 30 = red), gust factor abv hw (< 10 = green, 10-20 = yellow, 20+ = red)... all have classes in css style sheet