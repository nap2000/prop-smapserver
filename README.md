# Smap Client

This repository contains the client code (Web Browser) included in a release of the smap server.

## Modules

The client code is grouped into modules
* fieldManagerClient, administration Pages
* tasks, anything related to tasks
* fieldAnalysis,  the internal dashboard
* myWork,  launch and manage webForms
* smapServer, everything else

##### Other Projects

*  dashboard.  Integration of AWS quicksight. No longer maintained.

## Development

* Clone this project into ~/git
* Set an environment variable WEBSITE_DOCS equal the document root for the Apache web server
* Create a directory called "deploy" in your hone directory (~/deploy)

## Deployment

Run the script depALl.sh to build and deploy the modules.