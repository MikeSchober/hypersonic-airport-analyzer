
## Hypersonic Airport Analyzer

This is a web-based airport situation display application. 

The user inputs weather and NOTAMs for all desired airports and the application provides an in-depth analysis of each referenced location. 

The output includes the following:
* flight category identification
* open and available wind-favored runways
* available approaches
* headwind and crosswind components
* airport closure timeframes
* analysis of both METAR and TAF data, including consideration of NOTAMs and airport infrastructure

This was my first notable JavaScript project. All of the data processing and calculation logic is written in JavaScript (no external libraries or frameworks) and it uses a text file database on a node server for static airport data.

## Screenshot
![output screenshot](https://github.com/MikeSchober/hypersonic-airport-analyzer/blob/main/Screenshots/updated%20shots/OUTPUT1UPDATE.jpg)

This screenshot shows the airport analysis output. The timeline data reflects the airport's TAF analysis. A user would click on an individual METAR to display a textual analysis of the displayed observation.

## Updates
Although I have many ideas for further development of this application, I have stopped working on it to develop other things. This was my first notable JavaScript project though and I learned a ton from it!

## Licensing
Both Node.js and Express are licensed under the MIT license.

The settings icon seen in the screenshot is from ionicons (https://ionic.io/ionicons) and it is also licensed under the MIT license.

All of the above-mentioned licenses can be found in the license file in this repo.

Copyright (c) 2023 Mike Schober
